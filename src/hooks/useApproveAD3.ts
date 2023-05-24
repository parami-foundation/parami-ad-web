import { useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi"
import { AD3ContractAddress } from "../models/parami"
import AD3Contract from '../contracts/AD3.json';

export const useApproveAD3 = (spender: string, amount?: string) => {
  const { config, error: prepareError } = usePrepareContractWrite({
    address: AD3ContractAddress,
    abi: AD3Contract.abi,
    functionName: 'approve',
    args: [spender, amount]
  });
  const { data, isLoading: writeLoading, write: approve, isError, error } = useContractWrite(config);
  const { isLoading: waitTxLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    approve,
    isLoading: writeLoading || waitTxLoading,
    isSuccess,
    isError,
    error,
    prepareError
  }
}