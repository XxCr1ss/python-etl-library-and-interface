from etl import CSVExtractor  # Ajusta si tu archivo tiene otro nombre

# Ruta del archivo CSV
ruta = r"C:\Users\rodri\Desktop\DATOS\archivo_prueba_csv.csv"

try:
    # Crear instancia
    extractor = CSVExtractor(ruta)

    # Mostrar estadísticas básicas
    print("\nESTADÍSTICAS DEL ARCHIVO")
    stats = extractor.get_basic_stats()

    # Vista previa con formato fancy_grid
    print("\nVISTA PREVIA")
    extractor.preview_data(n=5)

    # Leer datos completos
    print("\nLEYENDO DATAFRAME COMPLETO")
    df = extractor.read_csv()

    # Validar estructura
    print("\nVALIDANDO ESTRUCTURA")
    is_valid, message = extractor.validate_csv_structure(
        required_columns=["id", "nombre"],
        min_rows=1
    )
    print("Resultado validación:", message)

    # Guardar copia del archivo
    print("\nGUARDANDO COPIA")
    extractor.tocsv(
        df,
        filename=r"C:\Users\rodri\Desktop\DATOS\archivo_CSV_MODIFICADO.csv",
        mode="replace"
    )

    print("\n✅ PRUEBA FINALIZADA CORRECTAMENTE")

except Exception as e:
    print(f"\n❌ Error durante la prueba: {e}")
