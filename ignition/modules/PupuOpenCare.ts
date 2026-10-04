import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PupuOpenCareModule", (m) => {
  const pupuCommons = m.contract("MochiCommons");
  return { pupuCommons };
});
