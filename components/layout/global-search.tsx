"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";
import { searchApp } from "@/lib/services/searchService";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export function GlobalSearch({ user }: { user: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchApp(query, user.role, user.id), [query, user.id, user.role]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "hidden w-64 justify-start text-muted-foreground md:inline-flex",
        )}
      >
        <Search />
        Search HRMS
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder={user.role === "MANAGEMENT" ? "Search employees, leave, announcements..." : "Search your attendance, leave, holidays..."}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No matching results.</CommandEmpty>
            <CommandGroup>
              {results.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={item.title}
                  onSelect={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
