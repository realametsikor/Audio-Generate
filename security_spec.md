# Security Specification

## Data Invariants
1. A show must have a valid `userId` that strictly matches `request.auth.uid`.
2. A show must exist under the `/users/{userId}/shows/{showId}` path.
3. The `createdAt` timestamp must match the server request time.
4. Users cannot modify or delete shows that belong to other users.
5. The `userId` must remain immutable.
6. The size of the `transcript` array must be bounded.

## The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Missing `request.auth`.
2. **Missing Required Fields**: Creating a show without a `title` or `userId`.
3. **Ghost Field**: Adding `isAdmin: true` to the show payload.
4. **Invalid Field Type**: Setting `duration` as a string instead of a number.
5. **ID Poisoning**: Using a `showId` that is over 128 characters or has invalid characters.
6. **Identity Spoofing**: `userId` in payload does not match `request.auth.uid`.
7. **Identity Spoofing (Path)**: Attempting to write to `/users/{otherUserId}/shows/...`.
8. **Invalid Timestamp**: Client attempts to set an arbitrary `createdAt` instead of `request.time`.
9. **Mutation of Immutable Fields**: Modifying the `userId` on update.
10. **Array Explosion**: Submitting a `transcript` array with > 1000 items.
11. **Email Spoofing (Unverified Email)**: User tries to write when their email is not verified.
12. **Unauthenticated Read**: Attempting to query `shows` without being signed in.
