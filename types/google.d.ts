type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAddressComponent = {
  longText: string;
  shortText: string;
  types: string[];
};

type GooglePlace = {
  addressComponents?: GoogleAddressComponent[];
  formattedAddress?: string;
  id?: string;
  location?: {
    lat: () => number;
    lng: () => number;
  };
  fetchFields: (options: { fields: string[] }) => Promise<void>;
};

type GooglePlaceSelectEvent = Event & {
  placePrediction: {
    toPlace: () => GooglePlace;
  };
};

type GooglePlacePrediction = {
  text: {
    toString: () => string;
  };
  toPlace: () => GooglePlace;
};

type GoogleAutocompleteSuggestion = {
  placePrediction?: GooglePlacePrediction;
};

type GoogleAutocompleteSessionToken = object;

type GooglePlacesLibrary = {
  AutocompleteSessionToken: new () => GoogleAutocompleteSessionToken;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      includedRegionCodes?: string[];
      language?: string;
      region?: string;
      sessionToken?: GoogleAutocompleteSessionToken;
    }) => Promise<{ suggestions: GoogleAutocompleteSuggestion[] }>;
  };
};

interface Window {
  google?: {
    accounts?: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          use_fedcm_for_prompt?: boolean;
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: {
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
            shape?: "rectangular" | "pill" | "circle" | "square";
            width?: number;
          },
        ) => void;
      };
    };
    maps?: {
      importLibrary: (libraryName: "places") => Promise<GooglePlacesLibrary>;
    };
  };
}
