import { redirect } from "next/navigation";

export default function GiftsRedirectPage() {
  redirect("/dashboard?tab=gifts");
}
