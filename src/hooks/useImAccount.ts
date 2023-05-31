import { useEffect, useState } from "react";
import { getMyIMAccount, ImAccount } from "../services/mining.service";
import { formatTwitterImageUrl } from "../utils/format.util";

export const useImAccount = () => {
  const [imAccount, setImAccount] = useState<ImAccount>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    setLoading(true);
    getMyIMAccount().then(imAccount => {
      if (imAccount) {
        setImAccount({
          ...imAccount,
          twitterProfileImageUri: formatTwitterImageUrl(imAccount.twitterProfileImageUri),
        });
      }
      setLoading(false);
    }).catch((e) => {
      console.log('Query imAccount error', e);
      setLoading(false);
    })
  }

  return {
    imAccount,
    loading,
    refresh
  };
}