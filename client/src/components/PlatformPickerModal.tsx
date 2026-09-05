import { CheckCircleIcon, ExternalLinkIcon, XIcon } from "lucide-react";
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
                disabled={isConnected || isConnecting}
                onClick={() => onConnect(platform.id)}
                className={`flex items-center gap-3 p-3.5 rounded-x1 border text-left transition-all ${isConnected ? "border-red-200 bg-red-50 cursor-default" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 curser-pointer"} ${isConnecting && "opacity:60"}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-slate-100 rounded-2xl">
                    <Icon className={`size-5 ${isConnected ? 'text-red-600' : 'text-slate-700'}`} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{platform.name}</div>
                    <div className="text-sm text-slate-500">{platform.description}</div>
                  </div>
                </div>

                {/* status */}
                {isConnected && <CheckCircleIcon className="size-4 text-red-500 shrink-0"/>}
                {isConnecting && <div className="size-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0"/>}
                {!isConnected && !isConnecting && <ExternalLinkIcon className="size-3.5 text-slate-400 shrink-0"/>}
              </button>
              /**1 : 53 : 00 */
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PlatformPickerModal
