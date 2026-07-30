export {};

declare global {
    interface Window {
        fbAsyncInit?: () => void;

        FB?: {
            init: (config: {
                appId: string;
                cookie?: boolean;
                xfbml?: boolean;
                version: string;
                autoLogAppEvents?: boolean;
            }) => void;

            login: (
                callback: (response: FacebookLoginResponse) => void,
                options: FacebookLoginOptions
            ) => void;
        };
    }

    interface FacebookLoginResponse {
        authResponse?: {
            code?: string;
            accessToken?: string;
            userID?: string;
            expiresIn?: number;
        };
        status?: string;
    }

    interface FacebookLoginOptions {
        config_id: string;
        response_type: "code";
        override_default_response_type: boolean;
        extras?: {
            setup?: Record<string, unknown>;
            featureType?: string;
            sessionInfoVersion?: string;
        };
    }
}