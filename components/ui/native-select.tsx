import * as React from "react";
import { cn } from "cn";
import { formControlClass } from "@/lib/ui/form-styles";

export {
  formControlClass,
  formDialogClass,
  formFieldControlClass,
  formFilterClass,
  formGridClass,
  formWideClass,
} from "@/lib/ui/form-styles";

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(formControlClass, className)} {...props} />;
}
