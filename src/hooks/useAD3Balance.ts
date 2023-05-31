import { useContractRead } from "wagmi";
import { AD3ContractAddress } from "../models/parami";
import AD3Contract from '../contracts/AD3.json';
import { BigNumber } from "ethers";
import { amountToFloatString } from '../utils/format.util'

export const useAD3Balance = (address: string) => {

  const { data: nftBalance } = useContractRead<unknown[], string, BigNumber>({
    address: AD3ContractAddress,
    abi: AD3Contract.abi,
    functionName: 'balanceOf',
    args: [address],
  });

  return amountToFloatString(nftBalance);
};