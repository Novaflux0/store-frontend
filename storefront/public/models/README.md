# 3D models

Optimised `.glb` files only. Run every model through glTF-Transform before adding it
(see `storefront/README.md`, "3D assets"). Draco / KTX2 decoders are self-hosted under
`public/decoders/`, never loaded from a CDN (plan A11, CSP `script-src 'self'`).
