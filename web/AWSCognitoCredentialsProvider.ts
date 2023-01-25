import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { CognitoIdentityCredentials } from "@aws-sdk/credential-provider-cognito-identity/dist-types/fromCognitoIdentity"
import {auth} from "aws-iot-device-sdk-v2";
/**
 * AWSCognitoCredentialOptions. The credentials options used to create AWSCongnitoCredentialProvider.
 */
interface AWSCognitoCredentialOptions
{
    IdentityPoolId : string,
    Region: string,
}

/**
 * AWSCognitoCredentialsProvider. The AWSCognitoCredentialsProvider implements AWS.CognitoIdentityCredentials.
 *
 */
export class AWSCognitoCredentialsProvider extends auth.CredentialsProvider{
    private options: AWSCognitoCredentialOptions;
    private cachedCredentials? : CognitoIdentityCredentials;


    constructor(private log: (msg: string) => void, options: AWSCognitoCredentialOptions, expire_interval_in_ms? : number)
    {
        super();
        this.options = options;

        setInterval(async ()=>{
            await this.refreshCredentials();
        },expire_interval_in_ms?? 3600*1000);
    }

    getCredentials() : auth.AWSCredentials {
        return {
            aws_access_id: this.cachedCredentials?.accessKeyId ?? "",
            aws_secret_key: this.cachedCredentials?.secretAccessKey ?? "",
            aws_sts_token: this.cachedCredentials?.sessionToken,
            aws_region: this.options.Region,
        }
    }

    async refreshCredentials()  {
        this.log('Fetching Cognito credentials');
        this.cachedCredentials = await fromCognitoIdentityPool({
            // Required. The unique identifier for the identity pool from which an identity should be
            // retrieved or generated.
            identityPoolId: this.options.IdentityPoolId,
            clientConfig: { region: this.options.Region },
        })();
    }
}