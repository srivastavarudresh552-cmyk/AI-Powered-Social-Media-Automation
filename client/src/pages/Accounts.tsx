import { useState } from "react";
import { dummyAccountsData, PLATFORMS } from "../assets/assets";
import { PlusIcon } from "lucide-react";
import AccountList from "../components/AccountList";
import PlatformPickerModal from "../components/PlatformPickerModal";

interface Account {
  _id: string;
  handle: string;
  platform: string;
  status: string;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>(dummyAccountsData);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    setTimeout(() => {
      const platformAccount = dummyAccountsData.find((item) => item.platform === platformId);
      const newAccount = platformAccount ?? {
        _id: `${platformId}-${Date.now()}`,
        handle: platformId,
        platform: platformId,
        status: "connected",
      };

      setAccounts((prev) => [...prev, newAccount]);
      setConnecting(null);
      setShowPlatformPicker(false);
    }, 1000);
  };

  const handleDisconnect = async (accountId: string) => {
    setAccounts((prev) => prev.filter((account) => account._id !== accountId));
  };

  const connectedIds = accounts.map((a) => a.platform);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
        <div>
          <h2 className="text-xl text-slate-900">Connected Accounts</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {accounts.length} of {PLATFORMS.length} platforms connected
          </p>
        </div>
        <button
          onClick={() => setShowPlatformPicker(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-all w-full sm:w-auto justify-center"
          type="button"
        >
          <PlusIcon className="size-4" /> Connect Account
        </button>
      </div>

      {showPlatformPicker && (
        <PlatformPickerModal
          connectedIds={connectedIds}
          connecting={connecting}
          onClose={() => setShowPlatformPicker(false)}
          onConnect={handleConnect}
        />
      )}

      {/* Connected Accounts List */}
      <AccountList accounts={accounts} onDisconnect={handleDisconnect} />
    </div>
  );
};

export default Accounts;
