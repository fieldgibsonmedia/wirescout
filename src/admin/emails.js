// The emails to the Wirescout team (ADMIN_EMAIL): new access requests.
// They hold real names and addresses, so they go only to the team, never to the logs.

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// requests: [{ name, email, reason, created_at }], oldest first.
export function buildAccessRequestsEmail(requests) {
  const blocks = requests.map(
    (request) =>
      `Name: ${request.name}\nEmail: ${request.email}\nReason: ${request.reason}\nAsked: ${londonTime.format(new Date(request.created_at))} (London)`,
  );
  return {
    subject: `Wirescout: ${plural(requests.length, "new access request", "new access requests")}`,
    text:
      `${requests.length === 1 ? "Someone asked" : "These people asked"} for access to Wirescout:\n\n` +
      `${blocks.join("\n\n")}\n\n` +
      "To let someone in: Table Editor → allowed_email_domains → Insert row, with their address or domain (lower case). " +
      "Reply to them by email, then set handled_at on their request in access_requests.\n",
  };
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}
