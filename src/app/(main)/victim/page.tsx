
import { BluetoothSOSPanel } from '@/components/victim/bluetooth-sos-panel';
import { BasicInfoForm } from '@/components/victim/basic-info-form';
import { Separator } from '@/components/ui/separator';

export default function VictimPage() {
  return (
    <div className="container mx-auto py-8 flex flex-col items-center space-y-12">
      <BluetoothSOSPanel />
      <Separator className="my-4 max-w-lg" />
      <BasicInfoForm />
    </div>
  );
}
