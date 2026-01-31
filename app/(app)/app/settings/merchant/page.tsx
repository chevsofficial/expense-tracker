import { redirect } from "next/navigation";

export default function MerchantSettingsRedirect() {
  redirect("/app/settings/merchants");
}
