"""Small arithmetic language compiled to SQLAlchemy; never evaluate user code."""
import ast
from decimal import Decimal
from sqlalchemy import literal, null, Numeric, cast, func
from .compiler import invalid


def compile_formulas(formulas, expressions, units):
    pending = {f.id: f for f in formulas}
    resolving = set()

    def resolve(name):
        if name in expressions:
            return expressions[name], units[name]
        if name not in pending or name in resolving:
            invalid("Una fórmula contiene referencias inexistentes o un ciclo.")
        resolving.add(name)
        formula = pending[name]
        try:
            tree = ast.parse(formula.expression, mode="eval")
        except (SyntaxError, RecursionError):
            invalid("Fórmula inválida. Usa identificadores, números y + - * /.")
        if len(list(ast.walk(tree))) > 80:
            invalid("La fórmula es demasiado compleja.")

        def visit(node):
            if isinstance(node, ast.Name):
                return resolve(node.id)
            if isinstance(node, ast.Constant) and type(node.value) in {int, float}:
                try:
                    value = Decimal(ast.get_source_segment(formula.expression, node).replace("_", ""))
                except ArithmeticError:
                    invalid("Usa constantes decimales válidas en la fórmula.")
                if not value.is_finite() or value.copy_abs() > Decimal("1e30"):
                    invalid("Constante numérica fuera de rango.")
                return literal(value), "scalar"
            if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
                value, unit = visit(node.operand)
                return (-value if isinstance(node.op, ast.USub) else value), unit
            if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
                left, lu = visit(node.left)
                right, ru = visit(node.right)
                if isinstance(node.op, (ast.Add, ast.Sub)):
                    if lu != ru:
                        invalid("No se pueden sumar/restar medidas de unidades diferentes.")
                    return (left + right if isinstance(node.op, ast.Add) else left - right), lu
                if isinstance(node.op, ast.Mult):
                    return left * right, ru if lu == "scalar" else lu if ru == "scalar" else f"({lu}*{ru})"
                return cast(left, Numeric()) / func.nullif(right, 0), "ratio" if lu == ru else f"{lu}/{ru}"
            invalid("Solo se admiten referencias, números y operaciones aritméticas; no llamadas ni atributos.")

        expression, unit = visit(tree.body)
        if formula.require_dimensionless and unit not in {"ratio", "scalar"}:
            invalid("Este indicador exige numerador y denominador de unidades compatibles.")
        if formula.unit != "auto" and formula.unit != unit:
            invalid("La unidad declarada de la fórmula no coincide con sus componentes.")
        expressions[name], units[name] = expression, unit
        resolving.remove(name)
        return expression, unit

    for formula in formulas:
        resolve(formula.id)
    return expressions
