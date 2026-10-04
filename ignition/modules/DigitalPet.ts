import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DigitalPetModule", (m) => {
  const digitalPet = m.contract("DigitalPet");
  return { digitalPet };
});
