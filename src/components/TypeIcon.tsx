import {
  AlignLeft,
  BookOpenText,
  CheckCircle2,
  CircleDashed,
  Heading,
  Info,
  Lightbulb,
  ListChecks,
  PencilLine,
  Sigma,
} from "lucide-react"
import type { QuestionType } from "../types/exam"

export default function TypeIcon({ type }: { type: QuestionType }) {
  if (type === "multiple") return <ListChecks size={17} />
  if (type === "trueFalse") return <CheckCircle2 size={17} />
  if (type === "fillBlank") return <AlignLeft size={17} />
  if (type === "section") return <Heading size={17} />
  if (type === "text") return <BookOpenText size={17} />
  if (type === "formula") return <Sigma size={17} />
  if (type === "info") return <Info size={17} />
  if (type === "example") return <Lightbulb size={17} />
  if (type === "none") return <CircleDashed size={17} />
  return <PencilLine size={17} />
}
