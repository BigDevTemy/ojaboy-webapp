"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/authClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { getAuthSession, saveAuthSession } from "@/lib/authSession";
import { ADDRESSES_URL, API_BASE_URL } from "@/Serverurls";

type UserAddress = {
  id: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  state: string;
  country: string;
  countryCode: string;
  postalCode: string;
  googlePlaceId: string;
  latitude: string;
  longitude: string;
  zoneStatus: string;
  zoneResolutionDetail: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deliveryZone: {
    id: string;
    name: string;
    description: string;
    deliveryCost: string;
    isActive: boolean;
  } | null;
};

type AddressForm = {
  label: string;
  recipientName: string;
  phoneNumber: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  streetNumber: string;
  route: string;
  neighborhood: string;
  sublocality: string;
  locality: string;
  localGovernmentArea: string;
  administrativeArea: string;
  state: string;
  country: string;
  countryCode: string;
  postalCode: string;
  googlePlaceId: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

const addressesEndpoint = `${API_BASE_URL}${ADDRESSES_URL}`;
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const emptyAddressForm: AddressForm = {
  label: "Home",
  recipientName: "",
  phoneNumber: "",
  formattedAddress: "",
  addressLine1: "",
  addressLine2: "",
  streetNumber: "",
  route: "",
  neighborhood: "",
  sublocality: "",
  locality: "",
  localGovernmentArea: "",
  administrativeArea: "",
  state: "",
  country: "Nigeria",
  countryCode: "NG",
  postalCode: "",
  googlePlaceId: "",
  latitude: "",
  longitude: "",
  isDefault: false,
};

function normalizeNigerianPhoneNumber(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("234")) {
    digits = digits.slice(3);
  }

  digits = digits.replace(/^0+/, "").slice(0, 10);
  return `+234${digits}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function readBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (value === 1 || value === "1" || value === "true") {
      return true;
    }
  }

  return false;
}

function parseAddress(value: unknown): UserAddress | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value, ["id", "addressId", "uuid"]);

  if (!id) {
    return null;
  }

  const deliveryZoneValue = isRecord(value.deliveryZone) ? value.deliveryZone : null;

  return {
    id,
    label: readString(value, ["label", "name", "type", "addressType"]) || "Address",
    recipientName: readString(value, [
      "recipientName",
      "fullName",
      "contactName",
      "receiverName",
    ]),
    phoneNumber: readString(value, ["phoneNumber", "phone", "contactPhone"]),
    formattedAddress: readString(value, ["formattedAddress", "fullAddress"]),
    addressLine1: readString(value, [
      "addressLine1",
      "line1",
      "street",
      "streetAddress",
      "address",
    ]),
    addressLine2: readString(value, ["addressLine2", "line2", "apartment"]),
    locality: readString(value, ["locality", "city", "town", "area"]),
    state: readString(value, ["state", "province", "region"]),
    country: readString(value, ["country", "countryName"]),
    countryCode: readString(value, ["countryCode"]),
    postalCode: readString(value, ["postalCode", "zipCode", "postcode"]),
    googlePlaceId: readString(value, ["googlePlaceId"]),
    latitude: readString(value, ["latitude", "lat"]),
    longitude: readString(value, ["longitude", "lng", "lon"]),
    zoneStatus: readString(value, ["zoneStatus"]),
    zoneResolutionDetail: readString(value, ["zoneResolutionDetail"]),
    isDefault: readBoolean(value, ["isDefault", "default", "is_default"]),
    createdAt: readString(value, ["createdAt"]),
    updatedAt: readString(value, ["updatedAt"]),
    deliveryZone: deliveryZoneValue
      ? {
          id: readString(deliveryZoneValue, ["id"]),
          name: readString(deliveryZoneValue, ["name"]),
          description: readString(deliveryZoneValue, ["description"]),
          deliveryCost: readString(deliveryZoneValue, ["deliveryCost"]),
          isActive: readBoolean(deliveryZoneValue, ["isActive"]),
        }
      : null,
  };
}

function extractAddresses(body: unknown) {
  if (Array.isArray(body)) {
    return body;
  }

  if (!isRecord(body)) {
    return [];
  }

  if (Array.isArray(body.addresses)) {
    return body.addresses;
  }

  if (Array.isArray(body.data)) {
    return body.data;
  }

  if (isRecord(body.data) && Array.isArray(body.data.addresses)) {
    return body.data.addresses;
  }

  return [];
}

function extractAddress(body: unknown) {
  if (!isRecord(body)) {
    return body;
  }

  if (body.address) {
    return body.address;
  }

  if (isRecord(body.data) && body.data.address) {
    return body.data.address;
  }

  return body.data ?? body;
}

function formatAddress(address: UserAddress) {
  if (address.formattedAddress) {
    return address.formattedAddress;
  }

  return [
    address.addressLine1,
    address.addressLine2,
    address.locality,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean).join(", ");
}

function saveDefaultAddressToSession(defaultAddress: UserAddress) {
  const currentSession = getAuthSession();

  if (!currentSession) {
    return;
  }

  saveAuthSession({
    ...currentSession,
    user: {
      ...currentSession.user,
      hasAddress: true,
      hasDefaultAddress: true,
      defaultAddress: {
        id: defaultAddress.id,
        label: defaultAddress.label,
        formattedAddress: formatAddress(defaultAddress),
        isDefault: true,
        deliveryZone: defaultAddress.deliveryZone ?? undefined,
      },
    },
  });
}

function formatMoney(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function fetchAddresses() {
  const response = await authenticatedFetch(addressesEndpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Unable to load addresses (${response.status}).`);
  }

  const body = (await response.json()) as unknown;
  return extractAddresses(body)
    .map(parseAddress)
    .filter((address): address is UserAddress => address !== null);
}

async function fetchAddress(addressId: string) {
  const response = await authenticatedFetch(
    `${addressesEndpoint}/${encodeURIComponent(addressId)}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to load address details (${response.status}).`);
  }

  const address = parseAddress(extractAddress((await response.json()) as unknown));

  if (!address) {
    throw new Error("The address details response is invalid.");
  }

  return address;
}

async function setDefaultAddress(addressId: string) {
  const response = await authenticatedFetch(
    `${addressesEndpoint}/${encodeURIComponent(addressId)}/default`,
    {
      method: "PATCH",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to set the default address (${response.status}).`);
  }
}

async function deleteAddress(addressId: string) {
  const response = await authenticatedFetch(
    `${addressesEndpoint}/${encodeURIComponent(addressId)}`,
    {
      method: "DELETE",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to delete the address (${response.status}).`);
  }
}

async function createAddress(form: AddressForm) {
  const payload = {
    ...form,
    phoneNumber: normalizeNigerianPhoneNumber(form.phoneNumber),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    googleAddressData: form.googlePlaceId
      ? {
          source: "google-places",
          placeId: form.googlePlaceId,
        }
      : null,
  };
  const response = await authenticatedFetch(addressesEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        `Unable to add the address (${response.status}).`,
      ),
    );
  }

  const body = response.status === 204 ? null : ((await response.json()) as unknown);
  return parseAddress(extractAddress(body));
}

function getGoogleAddressPart(
  components: GoogleAddressComponent[],
  type: string,
  shortName = false,
) {
  const component = components.find((item) => item.types.includes(type));
  return component ? (shortName ? component.shortText : component.longText) : "";
}

export function DashboardAddresses({
  embedded = false,
  forceAddAddress = false,
}: {
  embedded?: boolean;
  forceAddAddress?: boolean;
}) {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [addressToDelete, setAddressToDelete] = useState<UserAddress | null>(null);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(forceAddAddress);
  const [addressForm, setAddressForm] = useState<AddressForm>({
    ...emptyAddressForm,
    isDefault: forceAddAddress,
  });
  const [isCreatingAddress, setIsCreatingAddress] = useState(false);
  const [createAddressError, setCreateAddressError] = useState("");
  const [googlePlacesLibrary, setGooglePlacesLibrary] =
    useState<GooglePlacesLibrary | null>(null);
  const [googlePlacesStatus, setGooglePlacesStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [googleSearchValue, setGoogleSearchValue] = useState("");
  const [googleSuggestions, setGoogleSuggestions] = useState<
    GooglePlacePrediction[]
  >([]);
  const googleSessionTokenRef = useRef<GoogleAutocompleteSessionToken | null>(
    null,
  );
  const googleRequestIdRef = useRef(0);

  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setAddresses(await fetchAddresses());
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load addresses.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
  const isAnyModalOpen =
    Boolean(selectedAddressId) ||
    isAddAddressOpen ||
    Boolean(addressToDelete);

  if (isAnyModalOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [selectedAddressId, isAddAddressOpen, addressToDelete]);

  useEffect(() => {
    let isCancelled = false;

    void fetchAddresses()
      .then((responseAddresses) => {
        if (!isCancelled) {
          setAddresses(responseAddresses);

          if (forceAddAddress) {
            const existingDefaultAddress = responseAddresses.find(
              (address) => address.isDefault,
            );

            if (existingDefaultAddress) {
              saveDefaultAddressToSession(existingDefaultAddress);
            }
          }
        }
      })
      .catch((requestError: unknown) => {
        if (!isCancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load addresses.",
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [forceAddAddress]);

  async function initializeGooglePlaces() {
    if (!window.google?.maps) {
      setGooglePlacesStatus("error");
      return;
    }

    try {
      const placesLibrary = await window.google.maps.importLibrary("places");
      setGooglePlacesLibrary(placesLibrary);
      googleSessionTokenRef.current =
        new placesLibrary.AutocompleteSessionToken();
      setGooglePlacesStatus("ready");
    } catch {
      setGooglePlacesStatus("error");
      setCreateAddressError(
        "Google Places could not load. You can still enter the address manually.",
      );
    }
  }

  async function handleGoogleSearch(value: string) {
    setGoogleSearchValue(value);
    const requestId = ++googleRequestIdRef.current;

    if (!googlePlacesLibrary || value.trim().length < 3) {
      setGoogleSuggestions([]);
      return;
    }

    if (!googleSessionTokenRef.current) {
      googleSessionTokenRef.current =
        new googlePlacesLibrary.AutocompleteSessionToken();
    }

    try {
      const { suggestions } =
        await googlePlacesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value.trim(),
          includedRegionCodes: ["ng"],
          language: "en",
          region: "ng",
          sessionToken: googleSessionTokenRef.current,
        });

      if (requestId === googleRequestIdRef.current) {
        setGoogleSuggestions(
          suggestions.flatMap((suggestion) =>
            suggestion.placePrediction ? [suggestion.placePrediction] : [],
          ),
        );
      }
    } catch {
      if (requestId === googleRequestIdRef.current) {
        setGoogleSuggestions([]);
        setCreateAddressError(
          "Google could not search for that address. You can enter it manually.",
        );
      }
    }
  }

  async function selectGooglePlace(prediction: GooglePlacePrediction) {
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["addressComponents", "formattedAddress", "id", "location"],
      });
      const components = place.addressComponents ?? [];
      const streetNumber = getGoogleAddressPart(components, "street_number");
      const route = getGoogleAddressPart(components, "route");
      const administrativeArea = getGoogleAddressPart(
        components,
        "administrative_area_level_1",
      );

      setAddressForm((currentForm) => ({
        ...currentForm,
        formattedAddress: place.formattedAddress ?? currentForm.formattedAddress,
        addressLine1: [streetNumber, route].filter(Boolean).join(" "),
        streetNumber,
        route,
        neighborhood: getGoogleAddressPart(components, "neighborhood"),
        sublocality:
          getGoogleAddressPart(components, "sublocality_level_1") ||
          getGoogleAddressPart(components, "sublocality"),
        locality:
          getGoogleAddressPart(components, "locality") ||
          getGoogleAddressPart(components, "postal_town"),
        localGovernmentArea: getGoogleAddressPart(
          components,
          "administrative_area_level_2",
        ),
        administrativeArea,
        state: administrativeArea,
        country: getGoogleAddressPart(components, "country"),
        countryCode: getGoogleAddressPart(components, "country", true),
        postalCode: getGoogleAddressPart(components, "postal_code"),
        googlePlaceId: place.id ?? "",
        latitude: place.location?.lat().toString() ?? "",
        longitude: place.location?.lng().toString() ?? "",
      }));
      setGoogleSearchValue(
        place.formattedAddress ?? prediction.text.toString(),
      );
      setGoogleSuggestions([]);
      googleSessionTokenRef.current =
        googlePlacesLibrary
          ? new googlePlacesLibrary.AutocompleteSessionToken()
          : null;
    } catch {
      setCreateAddressError(
        "Google could not load the selected address details. Try another result.",
      );
    }
  }

  function updateAddressForm<Key extends keyof AddressForm>(
    key: Key,
    value: AddressForm[Key],
  ) {
    setAddressForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function closeAddAddress() {
    if (forceAddAddress) {
      return;
    }

    setIsAddAddressOpen(false);
    setAddressForm(emptyAddressForm);
    setCreateAddressError("");
  }

  async function handleCreateAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateAddressError("");

    const normalizedPhoneNumber = normalizeNigerianPhoneNumber(
      addressForm.phoneNumber,
    );

    if (!/^\+234\d{10}$/.test(normalizedPhoneNumber)) {
      setCreateAddressError(
        "Enter a valid Nigerian phone number, for example 07060934005.",
      );
      return;
    }

    if (!addressForm.latitude || !addressForm.longitude) {
      setCreateAddressError(
        "Select an address from Google suggestions or enter its latitude and longitude.",
      );
      return;
    }

    setIsCreatingAddress(true);

    try {
      const createdAddress = await createAddress(addressForm);

      let refreshedAddresses: UserAddress[] | null = null;

      if (createdAddress) {
        setAddresses((currentAddresses) => [
          ...(createdAddress.isDefault
            ? currentAddresses.map((address) => ({ ...address, isDefault: false }))
            : currentAddresses),
          createdAddress,
        ]);
      } else {
        refreshedAddresses = await fetchAddresses();
        setAddresses(refreshedAddresses);
      }

      const defaultAddress =
        (createdAddress?.isDefault ? createdAddress : null) ??
        (refreshedAddresses ?? (await fetchAddresses())).find(
          (address) => address.isDefault,
        ) ??
        null;

      if (defaultAddress) {
        saveDefaultAddressToSession(defaultAddress);
      }

      closeAddAddress();
    } catch (requestError) {
      setCreateAddressError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add the address.",
      );
    } finally {
      setIsCreatingAddress(false);
    }
  }

  async function openAddressDetails(addressId: string) {
    setSelectedAddressId(addressId);
    setSelectedAddress(null);
    setDetailsError("");
    setIsDetailsLoading(true);

    try {
      setSelectedAddress(await fetchAddress(addressId));
    } catch (requestError) {
      setDetailsError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load address details.",
      );
    } finally {
      setIsDetailsLoading(false);
    }
  }

  function closeAddressDetails() {
    setSelectedAddressId(null);
    setSelectedAddress(null);
    setDetailsError("");
    setIsDetailsLoading(false);
  }

  async function handleSetDefault(addressId: string) {
    setBusyAddressId(addressId);
    setMutationError("");

    try {
      await setDefaultAddress(addressId);
      setAddresses((currentAddresses) =>
        currentAddresses.map((address) => ({
          ...address,
          isDefault: address.id === addressId,
        })),
      );
      setSelectedAddress((currentAddress) =>
        currentAddress ? { ...currentAddress, isDefault: currentAddress.id === addressId } : null,
      );

      const newDefaultAddress = addresses.find((address) => address.id === addressId);
      if (newDefaultAddress) {
        saveDefaultAddressToSession(newDefaultAddress);
      }
    } catch (requestError) {
      setMutationError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to set the default address.",
      );
    } finally {
      setBusyAddressId(null);
    }
  }

  async function handleDeleteAddress() {
    if (!addressToDelete) {
      return;
    }

    const addressId = addressToDelete.id;
    setBusyAddressId(addressId);
    setMutationError("");

    try {
      await deleteAddress(addressId);
      setAddresses((currentAddresses) =>
        currentAddresses.filter((address) => address.id !== addressId),
      );
      setAddressToDelete(null);

      if (selectedAddressId === addressId) {
        closeAddressDetails();
      }
    } catch (requestError) {
      setMutationError(
        requestError instanceof Error ? requestError.message : "Unable to delete the address.",
      );
      setAddressToDelete(null);
    } finally {
      setBusyAddressId(null);
    }
  }

  return (
    <div className="space-y-5">
      {googleMapsApiKey ? (
        <Script
          id="google-maps-places"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places&v=weekly`}
          strategy="afterInteractive"
          onReady={() => void initializeGooglePlaces()}
          onError={() => {
            setGooglePlacesStatus("error");
            setCreateAddressError(
              "Google Places could not load. You can still enter the address manually.",
            );
          }}
        />
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {forceAddAddress ? (
            <h1 className="text-3xl font-black tracking-normal text-black">
              Add your delivery address
            </h1>
          ) : embedded ? (
            <h2 className="text-lg font-black text-black">Delivery Addresses</h2>
          ) : (
            <h1 className="text-3xl font-black tracking-normal text-black">Addresses</h1>
          )}
          <p className="mt-2 text-sm font-medium text-black/58">
            {forceAddAddress
              ? "A default delivery address is required before you can use the dashboard."
              : "Review delivery addresses and choose the default for future orders."}
          </p>
        </div>
        {!forceAddAddress ? <div className="flex gap-2">
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-4 text-sm font-black text-black/70 transition hover:text-[#f10606] disabled:opacity-50"
            disabled={isLoading}
            type="button"
            onClick={() => void loadAddresses()}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-4 text-sm font-black text-white"
            type="button"
            onClick={() => setIsAddAddressOpen(true)}
          >
            <Plus size={17} />
            Add Address
          </button>
        </div> : null}
      </div>

      {mutationError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {mutationError}
        </div>
      ) : null}

      {forceAddAddress ? null : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="h-64 animate-pulse rounded-xl border border-black/10 bg-white p-5"
              key={`address-loading-${index}`}
            >
              <div className="h-11 w-11 rounded-xl bg-black/8" />
              <div className="mt-5 h-4 w-28 rounded bg-black/8" />
              <div className="mt-3 h-3 w-full rounded bg-black/8" />
              <div className="mt-2 h-3 w-4/5 rounded bg-black/8" />
            </div>
          ))}
        </div>
      ) : error ? (
        <section className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <button
            className="mt-4 rounded-lg bg-[#f10606] px-5 py-3 text-sm font-black text-white"
            type="button"
            onClick={() => void loadAddresses()}
          >
            Try again
          </button>
        </section>
      ) : addresses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {addresses.map((address) => {
            const isBusy = busyAddressId === address.id;

            return (
              <article
                className={`relative rounded-xl border bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)] ${
                  address.isDefault ? "border-[#f10606] ring-4 ring-[#f10606]/5" : "border-black/10"
                }`}
                key={address.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                    <MapPin size={22} />
                  </div>
                  {address.isDefault ? (
                    <span className="flex items-center gap-1 rounded-full bg-[#f10606] px-3 py-1 text-[10px] font-black uppercase text-white">
                      <CheckCircle2 size={13} />
                      Default
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-4 text-lg font-black text-black">{address.label}</h2>
                {address.recipientName ? (
                  <p className="mt-2 flex items-center gap-2 text-sm font-bold text-black/68">
                    <UserRound size={15} />
                    {address.recipientName}
                  </p>
                ) : null}
                <p className="mt-3 min-h-12 text-sm font-medium leading-6 text-black/58">
                  {formatAddress(address) || "Address information is unavailable."}
                </p>
                {address.phoneNumber ? (
                  <p className="mt-2 flex items-center gap-2 text-xs font-bold text-black/48">
                    <Phone size={14} />
                    {address.phoneNumber}
                  </p>
                ) : null}
                {address.zoneStatus ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[#fafafa] px-3 py-2">
                    <span className="text-xs font-bold text-black/48">
                      {address.deliveryZone?.name || "Delivery coverage"}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      address.zoneStatus.toLowerCase() === "supported"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {address.zoneStatus}
                    </span>
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-black/10 pt-4">
                  <button
                    className={`flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 text-xs font-black text-black/65 transition hover:text-[#f10606] ${
                      address.isDefault ? "col-span-2" : ""
                    }`}
                    type="button"
                    onClick={() => void openAddressDetails(address.id)}
                  >
                    <Eye size={15} />
                    View
                  </button>
                  {
                    !address.isDefault ? (
                      <button
                        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:opacity-45"
                        disabled={isBusy}
                        type="button"
                        onClick={() => setAddressToDelete(address)}
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                      
                    ): ''
                  }
                  
                  {!address.isDefault ? (
                    <button
                      className="col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#f10606] text-xs font-black text-white disabled:opacity-50"
                      disabled={isBusy}
                      type="button"
                      onClick={() => void handleSetDefault(address.id)}
                    >
                      {isBusy ? <Loader2 className="animate-spin" size={15} /> : <Star size={15} />}
                      Set as default
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f0] text-[#f10606]">
            <MapPin size={23} />
          </div>
          <h2 className="mt-4 text-lg font-black text-black">No saved addresses</h2>
          <p className="mt-2 text-sm font-medium text-black/55">
            Saved delivery addresses will appear here.
          </p>
        </section>
      )}

      {selectedAddressId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddressDetails();
            }
          }}
        >
          <section
            aria-labelledby="address-details-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase text-[#f10606]">Address details</p>
                <h2 className="mt-1 text-lg font-black text-black" id="address-details-title">
                  {selectedAddress?.label ?? "Loading address"}
                </h2>
              </div>
              <button
                aria-label="Close address details"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-black/60"
                type="button"
                onClick={closeAddressDetails}
              >
                <X size={20} />
              </button>
            </div>

            {isDetailsLoading ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-8">
                <Loader2 className="animate-spin text-[#f10606]" size={30} />
                <p className="mt-4 text-sm font-bold text-black/55">Loading address...</p>
              </div>
            ) : detailsError ? (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-red-700">{detailsError}</p>
                <button
                  className="mt-4 rounded-lg bg-[#f10606] px-5 py-3 text-sm font-black text-white"
                  type="button"
                  onClick={() => void openAddressDetails(selectedAddressId)}
                >
                  Try again
                </button>
              </div>
            ) : selectedAddress ? (
              <div className="space-y-4 p-5 overflow-y-auto max-h-[80vh]">
                {selectedAddress.isDefault ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#f10606] px-3 py-1 text-xs font-black text-white">
                    <CheckCircle2 size={14} />
                    Default address
                  </span>
                ) : null}
                <AddressField label="Recipient" value={selectedAddress.recipientName} />
                <AddressField label="Phone number" value={selectedAddress.phoneNumber} />
                <AddressField label="Full address" value={formatAddress(selectedAddress)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <AddressField label="Locality" value={selectedAddress.locality} />
                  <AddressField label="Postal code" value={selectedAddress.postalCode} />
                  <AddressField
                    label="Delivery zone"
                    value={
                      selectedAddress.deliveryZone
                        ? `${selectedAddress.deliveryZone.name}${
                            selectedAddress.deliveryZone.isActive ? " (Active)" : " (Inactive)"
                          }`
                        : ""
                    }
                  />
                  <AddressField
                    label="Delivery cost"
                    value={
                      selectedAddress.deliveryZone?.deliveryCost
                        ? formatMoney(selectedAddress.deliveryZone.deliveryCost)
                        : ""
                    }
                  />
                </div>
                <AddressField
                  label="Coverage"
                  value={
                    [
                      selectedAddress.zoneStatus,
                      selectedAddress.zoneResolutionDetail,
                    ].filter(Boolean).join(" - ")
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <AddressField
                    label="Coordinates"
                    value={
                      selectedAddress.latitude && selectedAddress.longitude
                        ? `${selectedAddress.latitude}, ${selectedAddress.longitude}`
                        : ""
                    }
                  />
                  <AddressField
                    label="Last updated"
                    value={formatDate(selectedAddress.updatedAt)}
                  />
                </div>
                <AddressField
                  label="Google Place ID"
                  value={selectedAddress.googlePlaceId}
                />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {isAddAddressOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section
            aria-labelledby="add-address-title"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            role="dialog"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase text-[#f10606]">Delivery address</p>
                <h2 className="mt-1 text-xl font-black text-black" id="add-address-title">
                  Add Address
                </h2>
              </div>
              {!forceAddAddress ? (
                <button
                  aria-label="Close add address"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-black/60"
                  type="button"
                  onClick={closeAddAddress}
                >
                  <X size={20} />
                </button>
              ) : null}
            </div>

            <form className="space-y-5 p-5" onSubmit={handleCreateAddress}>
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                googleMapsApiKey
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}>
                {googleMapsApiKey
                  ? "Start typing and select a Google address suggestion to fill the structured fields."
                  : "Google Places is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable address suggestions; manual entry remains available."}
              </div>

              {createAddressError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {createAddressError}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <AddressInput label="Label" required value={addressForm.label} onChange={(value) => updateAddressForm("label", value)} />
                <AddressInput label="Recipient name" required value={addressForm.recipientName} onChange={(value) => updateAddressForm("recipientName", value)} />
                <label className="block">
                  <span className="text-xs font-black uppercase text-black/45">
                    Phone number
                  </span>
                  <input
                    autoComplete="tel"
                    className="mt-2 h-11 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none focus:border-[#f10606]"
                    inputMode="tel"
                    required
                    type="tel"
                    value={addressForm.phoneNumber}
                    onChange={(event) =>
                      updateAddressForm(
                        "phoneNumber",
                        normalizeNigerianPhoneNumber(event.target.value),
                      )
                    }
                  />
                  <span className="mt-1 block text-[11px] font-medium text-black/45">
                    Nigerian format: {normalizeNigerianPhoneNumber(addressForm.phoneNumber)}
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3 sm:mt-6">
                  <input
                    checked={addressForm.isDefault}
                    disabled={forceAddAddress}
                    type="checkbox"
                    onChange={(event) => updateAddressForm("isDefault", event.target.checked)}
                  />
                  <span className="text-sm font-black text-black/70">Make this my default address</span>
                </label>
              </div>

              {googleMapsApiKey ? (
                <div className="relative">
                  <p className="text-xs font-black uppercase text-black/45">
                    Search Google Places
                  </p>
                  <input
                    className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none focus:border-[#f10606]"
                    disabled={googlePlacesStatus !== "ready"}
                    placeholder={
                      googlePlacesStatus === "error"
                        ? "Google search unavailable"
                        : googlePlacesStatus === "loading"
                          ? "Loading Google address search..."
                          : "Start typing an address"
                    }
                    type="search"
                    value={googleSearchValue}
                    onChange={(event) =>
                      void handleGoogleSearch(event.target.value)
                    }
                  />
                  {googleSuggestions.length ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-black/10 bg-white p-1 shadow-xl">
                      {googleSuggestions.map((prediction, index) => (
                        <button
                          className="block w-full rounded-lg px-3 py-3 text-left text-sm font-bold text-black/75 transition hover:bg-[#fff0f0] hover:text-[#f10606]"
                          key={`${prediction.text.toString()}-${index}`}
                          type="button"
                          onClick={() => void selectGooglePlace(prediction)}
                        >
                          {prediction.text.toString()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <AddressInput
                label="Formatted address"
                required
                value={addressForm.formattedAddress}
                onChange={(value) => updateAddressForm("formattedAddress", value)}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <AddressInput label="Address line 1" required value={addressForm.addressLine1} onChange={(value) => updateAddressForm("addressLine1", value)} />
                <AddressInput label="Address line 2" value={addressForm.addressLine2} onChange={(value) => updateAddressForm("addressLine2", value)} />
                <AddressInput label="Street number" value={addressForm.streetNumber} onChange={(value) => updateAddressForm("streetNumber", value)} />
                <AddressInput label="Route / street" value={addressForm.route} onChange={(value) => updateAddressForm("route", value)} />
                <AddressInput label="Neighborhood" value={addressForm.neighborhood} onChange={(value) => updateAddressForm("neighborhood", value)} />
                <AddressInput label="Sublocality" value={addressForm.sublocality} onChange={(value) => updateAddressForm("sublocality", value)} />
                <AddressInput label="Locality / city" required value={addressForm.locality} onChange={(value) => updateAddressForm("locality", value)} />
                <AddressInput label="Local government area" value={addressForm.localGovernmentArea} onChange={(value) => updateAddressForm("localGovernmentArea", value)} />
                <AddressInput label="State" required value={addressForm.state} onChange={(value) => updateAddressForm("state", value)} />
                <AddressInput label="Postal code" value={addressForm.postalCode} onChange={(value) => updateAddressForm("postalCode", value)} />
                <AddressInput label="Country" required value={addressForm.country} onChange={(value) => updateAddressForm("country", value)} />
                <AddressInput label="Country code" required value={addressForm.countryCode} onChange={(value) => updateAddressForm("countryCode", value.toUpperCase())} />
                <AddressInput label="Latitude" required type="number" value={addressForm.latitude} onChange={(value) => updateAddressForm("latitude", value)} />
                <AddressInput label="Longitude" required type="number" value={addressForm.longitude} onChange={(value) => updateAddressForm("longitude", value)} />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-end">
                {!forceAddAddress ? (
                  <button className="h-11 rounded-lg border border-black/10 px-5 text-sm font-black text-black/65" disabled={isCreatingAddress} type="button" onClick={closeAddAddress}>
                    Cancel
                  </button>
                ) : null}
                <button className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-6 text-sm font-black text-white disabled:opacity-50" disabled={isCreatingAddress} type="submit">
                  {isCreatingAddress ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
                  Save Address
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {addressToDelete ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <section
            aria-labelledby="delete-address-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="alertdialog"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <h2 className="mt-4 text-xl font-black text-black" id="delete-address-title">
              Delete this address?
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-black/58">
              {formatAddress(addressToDelete) || addressToDelete.label} will be permanently removed.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="h-11 rounded-lg border border-black/10 text-sm font-black text-black/65"
                disabled={busyAddressId === addressToDelete.id}
                type="button"
                onClick={() => setAddressToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-black text-white disabled:opacity-50"
                disabled={busyAddressId === addressToDelete.id}
                type="button"
                onClick={() => void handleDeleteAddress()}
              >
                {busyAddressId === addressToDelete.id ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AddressField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fafafa] p-4">
      <p className="text-xs font-black uppercase text-black/42">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-black/72">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function AddressInput({
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-black/45">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none focus:border-[#f10606]"
        required={required}
        step={type === "number" ? "any" : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
