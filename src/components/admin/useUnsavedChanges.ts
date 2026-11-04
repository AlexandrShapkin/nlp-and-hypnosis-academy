"use client";
import { useEffect } from "react";
import { unsavedMessage } from "./messages";
/** Protect document exits, editor links, browser history and explicit logout. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      if (
        link &&
        link.target !== "_blank" &&
        link.getAttribute("href") &&
        !link.getAttribute("href")?.startsWith("#") &&
        !window.confirm(unsavedMessage)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const logout = (event: Event) => {
      if (!window.confirm(unsavedMessage)) event.preventDefault();
    };
    const historyNavigation = (event: Event) => {
      if (
        (event as Event & { navigationType?: string }).navigationType ===
          "traverse" &&
        event.cancelable &&
        !window.confirm(unsavedMessage)
      )
        event.preventDefault();
    };
    // The Navigation API can cancel a same-document history traversal before Next renders it.
    const navigation = (window as unknown as { navigation?: EventTarget })
      .navigation;
    let restoringHistory = false;
    const popstate = (event: PopStateEvent) => {
      if (restoringHistory) {
        restoringHistory = false;
        return;
      }
      if (!navigation && !window.confirm(unsavedMessage)) {
        event.stopImmediatePropagation();
        restoringHistory = true;
        window.history.forward();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    window.addEventListener("cms:before-logout", logout);
    navigation?.addEventListener("navigate", historyNavigation);
    window.addEventListener("popstate", popstate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
      window.removeEventListener("cms:before-logout", logout);
      navigation?.removeEventListener("navigate", historyNavigation);
      window.removeEventListener("popstate", popstate, true);
    };
  }, [dirty]);
}
