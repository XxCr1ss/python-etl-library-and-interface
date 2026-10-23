import { useDatabaseExtract as useLocalDatabaseExtract } from "@/components/etl/hooks/useDatabaseExtract";
import { useDatabaseExtractContext } from "@/components/etl/DatabaseExtractProvider";

export function useDatabaseExtract(active: boolean, agentId: string) {
  const context = useDatabaseExtractContext();
  const local = useLocalDatabaseExtract(!context && active, agentId);
  return context?.database ?? local;
}
