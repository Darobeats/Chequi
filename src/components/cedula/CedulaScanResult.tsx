import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, User, Calendar, MapPin, Droplet, XCircle, ShieldCheck, Building, Tag, Beer, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CedulaData, CedulaAutorizada } from '@/types/cedula';

interface CedulaScanResultProps {
  data: CedulaData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isUnauthorized?: boolean;
  autorizadaData?: CedulaAutorizada | null;
  requireWhitelist?: boolean;
  controlLimitInfo?: { current: number; max: number } | null;
  controlName?: string;
  allowSaveUnauthorized?: boolean;
  onSaveUnauthorized?: () => void;
}

export function CedulaScanResult({ 
  data, onConfirm, onCancel, isLoading, 
  isUnauthorized = false, autorizadaData, requireWhitelist,
  controlLimitInfo, controlName, allowSaveUnauthorized = false, onSaveUnauthorized
}: CedulaScanResultProps) {
  const { t } = useTranslation('common');
  const isLimitExceeded = controlLimitInfo && controlLimitInfo.max > 0 && controlLimitInfo.current >= controlLimitInfo.max;
  const shouldBlockConfirm = isLimitExceeded || (isUnauthorized && !allowSaveUnauthorized);

  return (
    <Card className={`p-6 ${isUnauthorized || isLimitExceeded ? 'border-destructive/50 bg-destructive/5' : 'border-primary/50 bg-primary/5'}`}>
      <div className="space-y-4">
        {isUnauthorized && !isLimitExceeded && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-500/10">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <AlertTitle className="font-bold text-orange-600">{t('cedulaScanResult.notOnList')}</AlertTitle>
            <AlertDescription className="text-orange-600">
              {t('cedulaScanResult.notOnListDesc')}
              {allowSaveUnauthorized && (
                <span className="block mt-1 text-sm">{t('cedulaScanResult.canSaveForReport')}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isLimitExceeded && (
          <Alert variant="destructive" className="border-destructive bg-destructive/10">
            <Beer className="h-5 w-5" />
            <AlertTitle className="font-bold">{t('cedulaScanResult.limitReached')}</AlertTitle>
            <AlertDescription>
              {controlName && <span className="font-semibold">{controlName}: </span>}
              {t('cedulaScanResult.alreadyUsed')} {controlLimitInfo.current} {t('cedulaScanResult.of')} {controlLimitInfo.max}.
            </AlertDescription>
          </Alert>
        )}

        {controlLimitInfo && controlLimitInfo.max > 0 && !isLimitExceeded && !isUnauthorized && (
          <Alert className="border-blue-500 bg-blue-500/10">
            <Beer className="h-5 w-5 text-blue-500" />
            <AlertTitle className="font-bold text-blue-600">{t('cedulaScanResult.usageInfo')}</AlertTitle>
            <AlertDescription className="text-blue-600">
              {controlName && <span className="font-semibold">{controlName}: </span>}
              {t('cedulaScanResult.usage')} {controlLimitInfo.current + 1} {t('cedulaScanResult.of')} {controlLimitInfo.max} {t('cedulaScanResult.allowed')}
            </AlertDescription>
          </Alert>
        )}

        {!isUnauthorized && !isLimitExceeded && requireWhitelist && autorizadaData && (
          <Alert className="border-green-500 bg-green-500/10">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <AlertTitle className="font-bold text-green-600">{t('cedulaScanResult.accessAuthorized')}</AlertTitle>
            <AlertDescription className="text-green-600">
              {t('cedulaScanResult.verifiedOnList')}
              {autorizadaData.categoria && (
                <span className="block mt-1"><Tag className="h-3 w-3 inline mr-1" />{t('cedulaScanResult.category')}: {autorizadaData.categoria}</span>
              )}
              {autorizadaData.empresa && (
                <span className="block"><Building className="h-3 w-3 inline mr-1" />{t('cedulaScanResult.company')}: {autorizadaData.empresa}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 mb-4">
          {isUnauthorized || isLimitExceeded ? (
            <XCircle className="h-6 w-6 text-destructive" />
          ) : (
            <CheckCircle className="h-6 w-6 text-primary" />
          )}
          <h3 className="text-lg font-semibold">
            {isLimitExceeded ? t('cedulaScanResult.limitReachedTitle') : isUnauthorized ? t('cedulaScanResult.notOnListTitle') : t('cedulaScanResult.scannedTitle')}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">{t('cedulaScanResult.fullName')}</p>
              <p className="font-semibold text-lg">{data.nombreCompleto}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('cedulaScanResult.idNumber')}</p>
              <p className="font-medium">{data.numeroCedula}</p>
            </div>
            
            {data.fechaNacimiento && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('cedulaScanResult.birthDate')}</p>
                  <p className="font-medium text-sm">{data.fechaNacimiento}</p>
                </div>
              </div>
            )}

            {data.sexo && (
              <div>
                <p className="text-sm text-muted-foreground">{t('cedulaScanResult.sex')}</p>
                <p className="font-medium">{data.sexo === 'M' ? t('cedulaScanResult.male') : t('cedulaScanResult.female')}</p>
              </div>
            )}

            {data.rh && (
              <div className="flex items-start gap-2">
                <Droplet className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('cedulaScanResult.rh')}</p>
                  <p className="font-medium">{data.rh}</p>
                </div>
              </div>
            )}

            {data.lugarExpedicion && (
              <div className="flex items-start gap-2 col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('cedulaScanResult.expeditionPlace')}</p>
                  <p className="font-medium">{data.lugarExpedicion}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          {isLimitExceeded ? (
            <Button onClick={onCancel} variant="destructive" className="w-full">
              {t('cedulaScanResult.closeAndScanAnother')}
            </Button>
          ) : isUnauthorized && allowSaveUnauthorized ? (
            <>
              <Button onClick={onSaveUnauthorized} variant="outline" className="w-full border-orange-500 text-orange-600 hover:bg-orange-500/10" disabled={isLoading}>
                {isLoading ? t('cedulaScanResult.saving') : t('cedulaScanResult.saveForReport')}
              </Button>
              <Button onClick={onCancel} variant="ghost" className="w-full" disabled={isLoading}>
                {t('cedulaScanResult.scanAnother')}
              </Button>
            </>
          ) : isUnauthorized ? (
            <Button onClick={onCancel} variant="destructive" className="w-full">
              {t('cedulaScanResult.closeAndScanAnother')}
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button onClick={onConfirm} className="flex-1" disabled={isLoading}>
                {isLoading ? t('cedulaScanResult.saving') : t('cedulaScanResult.confirmSave')}
              </Button>
              <Button onClick={onCancel} variant="outline" className="flex-1" disabled={isLoading}>
                {t('cedulaScanResult.cancel')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
