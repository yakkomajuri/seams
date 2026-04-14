import * as Primitive from '@radix-ui/react-switch';

interface Props {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
}

export function Switch({ checked, onCheckedChange, id }: Props) {
  return (
    <Primitive.Root
      className="switch-root"
      checked={checked}
      onCheckedChange={onCheckedChange}
      id={id}
    >
      <Primitive.Thumb className="switch-thumb" />
    </Primitive.Root>
  );
}
