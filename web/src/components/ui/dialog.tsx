import * as Primitive from '@radix-ui/react-dialog';

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;

export function DialogContent({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content className="dialog-content">
        {title && (
          <Primitive.Title
            className="mb-4 text-sm font-medium"
            style={{ color: 'var(--txt)' }}
          >
            {title}
          </Primitive.Title>
        )}
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export const DialogClose = Primitive.Close;
