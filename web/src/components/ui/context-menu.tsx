import * as Primitive from '@radix-ui/react-context-menu';

export const ContextMenu = Primitive.Root;
export const ContextMenuTrigger = Primitive.Trigger;

export function ContextMenuContent({ children }: { children: React.ReactNode }) {
  return (
    <Primitive.Portal>
      <Primitive.Content className="ctx-content">
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function ContextMenuItem({
  children,
  onSelect,
  destructive,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}) {
  return (
    <Primitive.Item
      className={`ctx-item${destructive ? ' destructive' : ''}`}
      onSelect={onSelect}
    >
      {children}
    </Primitive.Item>
  );
}

export function ContextMenuSeparator() {
  return <Primitive.Separator className="ctx-separator" />;
}
