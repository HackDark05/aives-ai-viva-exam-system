"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type GoogleCredential = {
  credential: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredential) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  disabled,
  onCredential,
}: {
  disabled?: boolean;
  onCredential: (idToken: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [clientId, setClientId] = useState<string | null>(null);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    api<{ clientId: string }>("/api/auth/config")
      .then((config) => {
        if (!cancelled) {
          setClientId(config.clientId.trim());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClientId("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId || !host.current) {
      return;
    }
    const parent = host.current;
    let cancelled = false;

    function render() {
      if (cancelled || !window.google || !clientId) {
        return;
      }
      parent.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(parent, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: Math.max(parent.offsetWidth, 320),
        logo_alignment: "left",
      });
    }

    if (window.google) {
      render();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={disabled || clientId === null}
        onClick={() =>
          toast.error("Google sign-in is not configured on the API.")
        }
      >
        Continue with Google
      </Button>
    );
  }

  return (
    <div
      ref={host}
      className={`flex h-10 w-full justify-center overflow-hidden [&_iframe]:!h-10 [&_iframe]:!w-full ${disabled ? "pointer-events-none opacity-50" : ""}`}
    />
  );
}
