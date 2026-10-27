"use client";

import { useEffect } from "react";
import { registrarJornada } from "../lib/jornada";

/** Coloque na página do material: registra no CRM que o lead abriu o conteúdo. */
export function TrackView({ isca }: { isca: string }) {
  useEffect(() => {
    registrarJornada("abriu_conteudo", { isca });
  }, [isca]);
  return null;
}
