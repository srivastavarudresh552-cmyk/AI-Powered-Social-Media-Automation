import { XIcon } from "lucide-react";
import { PLATFORMS } from "../assets/assets";

interface PlatformPickerModalProps {
  connectedIds: string[];
  connecting: string | null;
  onClose: () => void;
  onConnect: (platformId: string) => void;
}

const PlatformPickerModal = ({ connectedIds, connecting, onClose, onConnect }: PlatformPickerModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop:blur">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shadow">
          <h3 className="text-slate-700">Choose a Platform</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100" type="button">
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Platform list */}
        <div className="p-6 flex flex-col gap-2">
          {PLATFORMS.map((platform) => {
            const isConnected = connectedIds.includes(platform.id);
            const isConnecting = connecting === platform.id;
            const Icon = platform.icon;

            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => onConnect(platform.id)}
                disabled={isConnected}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 text-left hover:border-slate-300 transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-2xl">
                    <Icon className={`size-5 ${isConnected ? 'text-red-600' : 'text-slate-700'}`} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{platform.name}</div>
                    <div className="text-sm text-slate-500">{platform.description}</div>
                  </div>
                </div>
                <span className="text-sm text-slate-500">
                  {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Connect'}
                </span>
              </button>
              /**1 : 45 : 00 */
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PlatformPickerModal
