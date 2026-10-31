import { createFileRoute, redirect } from "@tanstack/react-router";

/** The check-in is now a sheet on the home: old links and reminders land there with it open. */
export const Route = createFileRoute("/checkin")({
  beforeLoad: () => { throw redirect({ to: "/", search: { checkin: 1 } }); },
});
