
import { BluetoothSOSPanel } from '@/components/victim/bluetooth-sos-panel';
import { BasicInfoForm } from '@/components/victim/basic-info-form';
import { Separator } from '@/components/ui/separator';

export default function VictimPage() {
  return (
    <div className="container mx-auto py-6 flex flex-col items-center space-y-8">
      <BluetoothSOSPanel />
      <Separator className="my-3 max-w-lg" />
      <BasicInfoForm />
    </div>
  );
}
