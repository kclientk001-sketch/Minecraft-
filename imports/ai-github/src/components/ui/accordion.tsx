"use client";
import * as Primitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { RuleItem } from "@/types";
export function RulesAccordion({ items }: { items: RuleItem[] }) {
  return (
    <Primitive.Root
      type="multiple"
      defaultValue={items.map((i) => i.slug)}
      className="rule-list"
    >
      {items.map((item, index) => (
        <Primitive.Item
          id={item.slug}
          key={item.id}
          value={item.slug}
          className="card rule-item"
        >
          <Primitive.Header>
            <Primitive.Trigger className="rule-trigger">
              <span className="rule-number">0{index + 1}</span>
              {item.title}
              <ChevronDown size={18} />
            </Primitive.Trigger>
          </Primitive.Header>
          <Primitive.Content className="rule-content prose-text">
            {item.body}
          </Primitive.Content>
        </Primitive.Item>
      ))}
    </Primitive.Root>
  );
}
