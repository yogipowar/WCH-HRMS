export {};

declare global {
  interface Window {
    WchHrmsApp?: {
      isNativeApp?: () => boolean;
      getPlatform?: () => string;
      getVersionCode?: () => number;
      getVersionName?: () => string;
      openUpdate?: (url: string) => void;
      startGoogleOAuth?: (url: string) => void;
    };
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: "popup" | "redirect";
            login_uri?: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "continue_with" | "signup_with";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              logo_alignment?: "left" | "center";
            },
          ) => void;
          prompt?: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
            }) => void,
          ) => void;
        };
      };
    };
  }
}
