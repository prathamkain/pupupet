import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MochiCommonsModule", (m) => {
  const mochiCommons = m.contract("MochiCommons");
  return { mochiCommons };
});
