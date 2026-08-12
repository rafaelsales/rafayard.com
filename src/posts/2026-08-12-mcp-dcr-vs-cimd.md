---
title: My gut flagged MCP's Dynamic Client Registration before the RFC did
description: "Rafael Sales on why MCP's Dynamic Client Registration (DCR) is a bad default, how CIMD fixes it, and why AI models don't flag it: they have no gut."
---
I'm building my first MCP server and AI told me to use the standard Dynamic Client Registration: expose a public endpoint, let any client POST its own metadata, hand back a client identity the server then trusts. No gate. I had not read RFC 7591, and I had never cleaned up after a registration incident. It still smelled wrong in about ten seconds. An open endpoint that mints trusted identities from self-asserted metadata is a bad default, and my gut flagged it long before I could cite a reason.

## Experience is compressed into instinct

The gut is pattern recognition you can't footnote. I could not quote a spec, but I have shipped enough systems to know the shape of "anyone can POST this and we trust the result," and I know where that shape tends to end up.

The smell had three parts: identity the caller asserts about itself, an endpoint anyone can reach, and trust that sticks around after. Put those together and you have built a place where a stranger names themselves and you believe them. I did not need the RFC to feel that. The RFC just agreed with me later.

## Why won't an AI model flag a bad default like DCR?

Because current flagship models build to spec. Ask GPT 5.6 Sol or Anthropic Fable at max effort to implement MCP auth with DCR and you get a correct DCR implementation, clean and complete. They are built to match the spec, not to feel that the spec itself is a bad idea.

This is not a knock on the models. They write auth flows faster and cleaner than most people I have worked with, and they rarely get the PKCE details wrong. But they have no scar tissue. They have never been paged at 3am because an open endpoint filled a table with junk, or watched a self-asserted client name turn into an account takeover. So they do not flinch.

That is the current division of labor. The model generates, and someone with judgment decides whether the thing should exist. The risk is not that models write bad code. It is that they write spec-correct bad defaults at machine speed, and if nobody in the loop has the gut to stop and ask "should this endpoint be open at all," the bad default ships.

## What is Dynamic Client Registration (DCR)?

Dynamic Client Registration (DCR) is an OAuth flow from RFC 7591 where a client POSTs its own metadata to a registration endpoint and the authorization server mints and stores a client_id, sometimes with a secret. MCP's first spec required it, usually with no gate, so any caller could register itself.

```
Client                              Authorization Server
  |                                          |
  |  POST /register { client metadata }      |
  |----------------------------------------->|
  |                                          |  writes a DB row,
  |                                          |  mints client_id (+ secret?)
  |  201 { client_id, client_secret }        |
  |<-----------------------------------------|
  |                                          |
  |  GET /authorize?client_id=...            |
  |----------------------------------------->|
  |                                          |  looks up the stored row
  |         code, then token (PKCE)          |
  |<---------------------------------------->|
```

Here is what bothers me about it as a default.

The metadata is self-asserted and nothing anchors it. A client can register with the name "Claude Code" and the server has no way to check. It ends up holding a string it decided to believe. RFC 7591 says this out loud: treat all client metadata as self-asserted, because a rogue client might use the name and logo of one it wants to impersonate.

The endpoint invites abuse. Open registration is a denial-of-service target, and every registration is a row. You get unbounded table growth, garbage records from one-time clients, and no clear story for expiring any of it.

The trust lands in the wrong place. It sits on a value the client typed, instead of on something the server can verify.

None of this is theory. Square's MCP server ran dynamic registration without restricting redirect URIs, and it proxied to Square's own auth server with one shared client_id and no tie between the login and the user's session. So an attacker could approve consent once, hand a victim a crafted link that skipped the consent screen, and have the code delivered to the attacker's own redirect. A confused deputy. Obsidian Security wrote it up, and the fix was to restrict redirect URIs during registration. My gut was pointing at a real hole.

### The one control that actually saves DCR (a live look at Datadog)

So is every open registration endpoint a disaster? No. Here is why.

While researching this, I poked at Datadog's real registration endpoint at `us5.datadoghq.com/api/v2/oauth2/register`. It is open and unauthenticated. An empty POST returns 201 with a client_id. On its own that looks alarming.

Now change the request. Send `client_name: "Claude Code"` with the exact metadata the real Claude Code sends, and you get back Datadog's pre-provisioned, branded client_id. Change anything, a foreign redirect URI or a trimmed body, and you drop to a single generic shared client instead. You cannot attach your own redirect to the branded identity through registration.

The decisive test is at the authorize endpoint:

```
redirect_uri = http://localhost:3118/callback   ->  "Claude Code" consent screen
redirect_uri = https://attacker.example/cb       ->  invalid_request: Mismatching redirect URI
```

That is the whole game. The open endpoint is not the vulnerability. Strict redirect URI enforcement is what holds the line. Datadog enforces it, so a mismatched redirect has nowhere to send the code. Restricting the redirect during registration was exactly the fix Square shipped.

The rule is not "never expose registration." The rule is: treat client metadata as self-asserted, and never let it be the security boundary. Put the boundary on the redirect URI and the authenticated consent screen. Datadog does. That is why my gut said "fishy" and not "doomed."

## What are Client ID Metadata Documents (CIMD)?

Client ID Metadata Documents (CIMD) are the fix MCP adopted, and the default since the 2025-11-25 spec. The client_id is an HTTPS URL that hosts the client's metadata. The authorization server fetches that document when it sees the URL, verifies it, and stores no registration record. Trust is anchored in domain control instead of a self-asserted string.

```
Client publishes once:  https://app.example.com/client.json

Client                              Authorization Server
  |                                          |
  |  GET /authorize                          |
  |    ?client_id=https://app.example.com/client.json
  |----------------------------------------->|
  |                                          |  unfamiliar URL, so fetch it:
  |                                          |    GET https://app.example.com/client.json
  |                                          |    check: id == url, HTTPS only,
  |                                          |    SSRF guards, redirect_uri in doc
  |                                          |  trust = the domain it came from
  |         code, then token (PKCE)          |
  |<---------------------------------------->|
```

The move is small on the wire and large in meaning:

```
DCR:   AS trusts  ->  a string the client typed   ( "client_name": "Claude Code" )
CIMD:  AS trusts  ->  a domain it fetched from     ( https://claude.ai/...  is verifiable )
```

Look at what changes and what does not.

What stays the same: everything from the consent screen onward. The code and the PKCE token exchange are identical to DCR. CIMD only changes the front door, the authorize request, where the client_id is now a URL the server fetches instead of an opaque string it stored.

What changes: the client_id is now a URL the client controls, and the server fetches the metadata from it instead of storing a registration. That single move fixes most of the DCR complaints at once:

- No server-side state. No table to grow, no registration endpoint to flood, no lifecycle mess.
- Portable identity. One document works at every authorization server, instead of a fresh registration per server.
- No secret at rest. Public clients use PKCE; confidential clients sign with `private_key_jwt` against a JWKS published in the document.
- Impersonation gets hard. To claim an identity you have to control its domain. The server is no longer trusting a string, it is trusting a domain it fetched from, and a domain is something it can reason about.

CIMD is not free, and I would rather say the costs out loud:

- SSRF surface. The server now makes an outbound request to a URL the client supplied. It needs the guards: HTTPS only, block special-use IP ranges, do not follow redirects, cap the body size, and confirm the document's client_id matches the URL it came from.
- Availability coupling. If the metadata document is down, authentication breaks. Caching softens it.
- Mutable, client-controlled metadata, plus the classic problem of a domain lapsing and getting bought by someone else.

DCR still has a narrow place: clients that genuinely cannot host a URL. That is why MCP kept DCR as MAY and made CIMD SHOULD. Signed software statements, for stronger asserted identity on top of CIMD, are a separate proposal (SEP-1032), not part of the shipped spec. As a default, CIMD moves trust onto something the server can actually check. That is the fix.

## DCR vs CIMD: what is the difference?

The difference is where trust lives. With DCR, the client registers by POSTing self-asserted metadata and the authorization server stores a client_id it must then trust. With CIMD, the client_id is an HTTPS URL the server fetches on demand, so trust is anchored in domain control and the server stores nothing.

- Client identity: DCR mints an opaque client_id and stores it. CIMD uses an HTTPS URL as the client_id and stores nothing.
- Trust anchor: DCR trusts self-asserted metadata. CIMD trusts the domain the document is served from.
- Server state: DCR grows a database of registrations. CIMD keeps none.
- Impersonation: DCR needs only a matching string. CIMD needs control of the domain.
- Main new risk: DCR is a denial-of-service and junk-data target. CIMD adds an SSRF surface from the outbound fetch.
- MCP status (2025-11-25 spec): DCR is MAY, a fallback. CIMD is SHOULD, the default.

Everything after the consent screen is the same in both. The code and the PKCE token exchange do not change. Only the way the client is identified at the front door does.

## The part that stays human

The RFC warnings and the real incidents eventually spelled out, in careful language, what instinct flagged in ten seconds: do not build trust on a string a stranger typed. CIMD is what it looks like when you move that trust onto something verifiable.

The lesson I take from it is not "distrust the models." They will write the code, and write it well. The part that is still mine is the gut that stops and asks whether the default should exist at all. That instinct is not in the training data. It is in the incidents I lived through, the tables I watched grow, the 3am pages. It is judgment, and judgment is the thing worth writing down. That is [why I write here](/why-i-write-here/).

Models will write the code. You still have to be the one who smells the smoke.
