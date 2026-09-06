"use client";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { CSSProperties } from "react";
type Option = string | { value: string; label: string; disabled?: boolean };
export function ThemedSelect({
  value,
  onValueChange,
  options,
  label,
  id,
  disabled = false,
  className = "",
  style,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  label: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        aria-label={label}
        className={`app-select-trigger ${className}`}
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className={`app-select-content ${style ? "select-in-theme theme-scope" : ""}`}
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          style={style}
        >
          <Select.ScrollUpButton className="select-scroll">
            <ChevronUp size={13} />
          </Select.ScrollUpButton>
          <Select.Viewport>
            {options.map((item) => {
              const o =
                typeof item === "string" ? { label: item, value: item } : item;
              return (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  disabled={o.disabled}
                  className="app-select-item"
                >
                  <Select.ItemText>{o.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={13} />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
          <Select.ScrollDownButton className="select-scroll">
            <ChevronDown size={13} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
