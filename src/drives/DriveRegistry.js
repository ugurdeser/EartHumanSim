import { CreatingDrive } from './environmental/CreatingDrive.js';
import { HoardingDrive } from './environmental/HoardingDrive.js';
import { ComfortDrive } from './physiological/ComfortDrive.js';
import { DisgustDrive } from './physiological/DisgustDrive.js';
import { FearDrive } from './physiological/FearDrive.js';
import { HungerDrive } from './physiological/HungerDrive.js';
import { CuriosityDrive } from './psychological/CuriosityDrive.js';
import { PlayDrive } from './psychological/PlayDrive.js';
import { AttractionDrive } from './reproductive/AttractionDrive.js';
import { DesireDrive } from './reproductive/DesireDrive.js';
import { LoveDrive } from './reproductive/LoveDrive.js';
import { NurtureDrive } from './reproductive/NurtureDrive.js';
import { AffiliationDrive } from './social/AffiliationDrive.js';
import { JusticeDrive } from './social/JusticeDrive.js';
import { StatusDrive } from './social/StatusDrive.js';

/** Tablodaki 15 temel güdü, sütun sırasıyla. */
export const DRIVE_TYPES = Object.freeze([
  HoardingDrive,
  CreatingDrive,
  FearDrive,
  DisgustDrive,
  HungerDrive,
  ComfortDrive,
  DesireDrive,
  AttractionDrive,
  LoveDrive,
  NurtureDrive,
  CuriosityDrive,
  PlayDrive,
  AffiliationDrive,
  StatusDrive,
  JusticeDrive,
]);
