import * as React from "react"
import { createRoot } from "react-dom/client"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-ui/select"

// Example harness page: the popup's "Translation Service" grouped select, mounted
// in isolation with the REAL select.tsx primitives so WebKit reproduces Safari's
// exact positioning. Swap this out to exercise any other component.
//
// Tweak behaviour via URL query params (drive.mjs passes them per config):
//   ?align=start|center|end   — SelectContent align (default: end, like the popup)
//   ?w=anchor|fit             — popup width mode (default: fit; "anchor" reproduces the old bug)
interface Provider { id: string, name: string, kind: "llm" | "normal" }
const PROVIDERS: Provider[] = [
  { id: "openai", name: "OpenAI", kind: "llm" },
  { id: "deepseek", name: "DeepSeek", kind: "llm" },
  { id: "tensdaq", name: "Tensdaq", kind: "llm" },
  { id: "gemini", name: "Gemini", kind: "llm" },
  { id: "microsoft", name: "Microsoft Translator", kind: "normal" },
  { id: "google", name: "Google Translate", kind: "normal" },
  { id: "deeplx", name: "DeepLX", kind: "normal" },
]
function Logo() {
  return <span className="size-4 rounded bg-neutral-400 shrink-0" />
}

const params = new URLSearchParams(location.search)
const align = (params.get("align") as "start" | "center" | "end" | null) ?? "end"
// "fit" = ship behaviour (size to content so align takes effect).
// "anchor" = the original bug (w-(--anchor-width) traps positioning at the trigger width).
const contentClassName = params.get("w") === "anchor" ? "min-w-fit" : "w-fit max-w-(--available-width)"

function TranslationServiceRow() {
  const [value, setValue] = React.useState<Provider>(PROVIDERS[0])
  const llm = PROVIDERS.filter(p => p.kind === "llm")
  const normal = PROVIDERS.filter(p => p.kind === "normal")
  return (
    <div className="flex items-center justify-between gap-2 px-6 py-4">
      <span className="text-[13px] font-medium">Translation Service</span>
      <Select<Provider>
        value={value}
        onValueChange={p => p && setValue(p)}
        itemToStringValue={p => p.id}
      >
        <SelectTrigger className="h-7! w-31 cursor-pointer pr-1.5 pl-2.5" size="sm">
          <SelectValue>{(p: Provider) => <><Logo />{p.name}</>}</SelectValue>
        </SelectTrigger>
        <SelectContent className={contentClassName} align={align}>
          <SelectGroup>
            <SelectLabel>AI Translator</SelectLabel>
            {llm.map(p => <SelectItem key={p.id} value={p}><Logo />{p.name}</SelectItem>)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Normal Translator</SelectLabel>
            {normal.map(p => <SelectItem key={p.id} value={p}><Logo />{p.name}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<TranslationServiceRow />)
