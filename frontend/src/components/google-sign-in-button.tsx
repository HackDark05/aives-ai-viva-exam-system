"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID || !host.current) {
      return;
    }
    const parent = host.current;
    let cancelled = false;

    function render() {
      if (cancelled || !window.google || !CLIENT_ID) {
        return;
      }
      parent.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(parent, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: parent.offsetWidth || 360,
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
  }, []);

  if (!CLIENT_ID) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={disabled}
        onClick={() =>
          toast.error(
            "Add a Google client ID to enable Google sign-in.",
          )
        }
      >
        Continue with Google
      </Button>
    );
  }

  return (
    <div
      ref={host}
      className={`flex min-h-11 w-full justify-center [&_iframe]:!w-full ${disabled ? "pointer-events-none opacity-50" : ""}`}
    />
  );
}
