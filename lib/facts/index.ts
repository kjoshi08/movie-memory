import { createFactService } from "@/lib/facts/service";
import { postgresFactStore } from "@/lib/facts/store";
import { generateMovieFact } from "@/lib/facts/openai";

export const getMovieFact = createFactService({ store: postgresFactStore, generate: generateMovieFact });
