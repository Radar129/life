
import { BluetoothSOSPanel } from '@/components/victim/bluetooth-sos-panel';
import { BasicInfoForm } from '@/components/victim/basic-info-form';
import { ConnectivityStatusBox } from '@/components/victim/connectivity-status-box';
import { NotificationLogPanel } from '@/components/victim/notification-log-panel';
import { Separator } from '@/components/ui/separator';

export default function VictimPage() {
  return (
    <div className="container mx-auto py-4 sm:py-6 flex flex-col items-center space-y-6">
      <BluetoothSOSPanel />
      <Separator className="my-2 w-full max-w-2xl" />
      <ConnectivityStatusBox />
      <Separator className="my-2 w-full max-w-2xl" />
      <BasicInfoForm />
      <Separator className="my-2 w-full max-w-2xl" />
      <NotificationLogPanel />
    </div>
  );
}
