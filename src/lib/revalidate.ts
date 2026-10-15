import { revalidatePath } from "next/cache";

/** Refresca el panel del comité y su pantalla de TV. */
export function revalidateConsole(code: string) {
  revalidatePath(`/comite/${code}`, "layout");
  revalidatePath(`/vista-tv/${code}`);
}
