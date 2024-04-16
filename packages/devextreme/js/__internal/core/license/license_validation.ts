import errors from '@js/core/errors';
import { version as packageVersion } from '@js/core/version';

import { base64ToBytes } from './byte_utils';
import { INTERNAL_USAGE_ID, PUBLIC_KEY } from './key';
import { pad } from './pkcs1';
import { compareSignatures } from './rsa_bigint';
import { sha1 } from './sha1';
import {
  DX_LICENSE_TRIGGER_NAME,
  registerTrialPanelComponents,
  trialPanelAttributeNames,
} from './trial_panel';
import type {
  CustomTrialPanelOptions,
  License,
  LicenseCheckParams,
  ParsedVersion,
  Token,
  TrialPanelOptions,
} from './types';
import { TokenKind } from './types';

interface Payload extends Partial<License> {
  readonly format?: number;
  readonly internalUsageId?: string;
}

const SPLITTER = '.';
const FORMAT = 1;
const RTM_MIN_PATCH_VERSION = 3;
const MAX_MINOR_VERSION = 2;

const BUY_NOW_LINK = 'https://go.devexpress.com/Licensing_Installer_Watermark_DevExtreme.aspx';

const GENERAL_ERROR: Token = { kind: TokenKind.corrupted, error: 'general' };
const VERIFICATION_ERROR: Token = { kind: TokenKind.corrupted, error: 'verification' };
const DECODING_ERROR: Token = { kind: TokenKind.corrupted, error: 'decoding' };
const DESERIALIZATION_ERROR: Token = { kind: TokenKind.corrupted, error: 'deserialization' };
const PAYLOAD_ERROR: Token = { kind: TokenKind.corrupted, error: 'payload' };
const VERSION_ERROR: Token = { kind: TokenKind.corrupted, error: 'version' };

let validationPerformed = false;

// verifies RSASSA-PKCS1-v1.5 signature
function verifySignature({ text, signature: encodedSignature }: {
  text: string;
  signature: string;
}): boolean {
  return compareSignatures({
    key: PUBLIC_KEY,
    signature: base64ToBytes(encodedSignature),
    actual: pad(sha1(text)),
  });
}

export function parseLicenseKey(encodedKey: string | undefined): Token {
  if (encodedKey === undefined) {
    return GENERAL_ERROR;
  }

  const parts = encodedKey.split(SPLITTER);

  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    return GENERAL_ERROR;
  }

  if (!verifySignature({ text: parts[0], signature: parts[1] })) {
    return VERIFICATION_ERROR;
  }

  let decodedPayload = '';
  try {
    decodedPayload = atob(parts[0]);
  } catch {
    return DECODING_ERROR;
  }

  let payload: Payload = {};
  try {
    payload = JSON.parse(decodedPayload);
  } catch {
    return DESERIALIZATION_ERROR;
  }

  const {
    customerId, maxVersionAllowed, format, internalUsageId, ...rest
  } = payload;

  if (internalUsageId !== undefined) {
    return {
      kind: TokenKind.internal,
      internalUsageId,
    };
  }

  if (customerId === undefined || maxVersionAllowed === undefined || format === undefined) {
    return PAYLOAD_ERROR;
  }

  if (format !== FORMAT) {
    return VERSION_ERROR;
  }

  return {
    kind: TokenKind.verified,
    payload: {
      customerId,
      maxVersionAllowed,
      ...rest,
    },
  };
}

function parseVersion(version: string): ParsedVersion {
  const [major, minor, patch] = version.split('.').map(Number);

  return {
    major,
    minor,
    patch,
  };
}

function getLicenseCheckParams({ licenseKey, version }: {
  licenseKey: string | undefined;
  version: string;
}): LicenseCheckParams {
  let preview = false;

  try {
    const { major, minor, patch } = parseVersion(version);
    preview = isNaN(patch) || patch < RTM_MIN_PATCH_VERSION;

    if (!licenseKey) {
      return { preview, error: 'W0019' };
    }

    const license = parseLicenseKey(licenseKey);

    if (license.kind === TokenKind.corrupted) {
      return { preview, error: 'W0021' };
    }

    if (license.kind === TokenKind.internal) {
      return { preview, internal: true, error: license.internalUsageId === INTERNAL_USAGE_ID ? undefined : 'W0020' };
    }

    if (!(major && minor)) {
      return { preview, error: 'W0021' };
    }

    if (major * 10 + minor > license.payload.maxVersionAllowed) {
      return { preview, error: 'W0020' };
    }

    return { preview, error: undefined };
  } catch {
    return { preview, error: 'W0021' };
  }
}

function renderTrialPanel(attributes: Record<string, string>): void {
  registerTrialPanelComponents();

  const trialPanelTrigger = document.createElement(DX_LICENSE_TRIGGER_NAME);

  Object.entries(attributes).forEach(([attrName, attrValue]) => {
    trialPanelTrigger.setAttribute(attrName, attrValue);
  });

  document.body.appendChild(trialPanelTrigger);
}

export function showTrialPanel({
  buyNowUrl,
  version,
}: TrialPanelOptions): void {
  renderTrialPanel({
    [trialPanelAttributeNames.buyNow]: buyNowUrl,
    [trialPanelAttributeNames.version]: version,
  });
}

export function showCustomTrialPanel({
  buyNowUrl,
  customMessagePattern,
  customLinkText,
}: CustomTrialPanelOptions): void {
  const attributes: Record<string, string> = {};

  attributes[trialPanelAttributeNames.message] = customMessagePattern;

  if (customLinkText && buyNowUrl) {
    attributes[trialPanelAttributeNames.buyNow] = buyNowUrl;
    attributes[trialPanelAttributeNames.linkText] = customLinkText;
  }

  renderTrialPanel(attributes);
}

function shouldShowTrialPanel(
  { preview, internal, error }: LicenseCheckParams,
  licenseKey: string,
  version: string,
): boolean {
  if (!error || internal) {
    return false;
  }

  if (preview) {
    const { major, minor, patch } = parseVersion(version);

    const previousMajor = (
      minor === 1 ? [major - 1, MAX_MINOR_VERSION, patch] : [major, minor - 1, patch]
    ).join(SPLITTER);

    const { error: previousMajorError } = getLicenseCheckParams({
      licenseKey,
      version: previousMajor,
    });

    if (!previousMajorError) {
      return false;
    }
  }

  return true;
}

export function validateLicense(licenseKey: string, version: string = packageVersion): void {
  if (validationPerformed) {
    return;
  }
  validationPerformed = true;

  const checkParams = getLicenseCheckParams({ licenseKey, version });

  if (shouldShowTrialPanel(checkParams, licenseKey, version)) {
    showTrialPanel({
      buyNowUrl: BUY_NOW_LINK,
      version,
    });
  }

  const { preview, internal, error } = checkParams;

  if (error) {
    errors.log(preview ? 'W0022' : error);
    return;
  }

  if (preview && !internal) {
    errors.log('W0022');
  }
}

export function peekValidationPerformed(): boolean {
  return validationPerformed;
}

export function setLicenseCheckSkipCondition(value = true): void {
  /// #DEBUG
  validationPerformed = value;
  /// #ENDDEBUG
}

// NOTE: We need this default export
// to allow QUnit mock the validateLicense function
export default {
  validateLicense,
};
