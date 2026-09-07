import { BoggleGameMain } from "@/components/boggle/BoggleGameMain";
import { ClientOnly } from "@/components/ClientOnly";
import { DictionaryStatus } from "@/components/DictionaryStatus";

export default function BogglePage() {
  return (
    <>
      <BoggleGameMain />
      <ClientOnly>
        <DictionaryStatus />
      </ClientOnly>
    </>
  );
}
