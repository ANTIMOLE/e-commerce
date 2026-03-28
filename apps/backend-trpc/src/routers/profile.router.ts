import { z }                  from "zod";
import { router, protectedProcedure } from "../trpc/init";
import { serviceCall }        from "../trpc/errors";
import { updateProfileSchema, addressSchema } from "@ecommerce/shared";
import * as profileService    from "../services/profile.service";

export const profileRouter = router({

  // ── GET /profile ──────────────────────────────────────────
  // REST:  GET /profile
  // tRPC:  trpc.profile.get.useQuery()
  get: protectedProcedure.query(async ({ ctx }) => {
    return serviceCall(() => profileService.getProfile(ctx.userId!));
  }),

  // ── PATCH /profile ────────────────────────────────────────
  // REST:  PATCH /profile  body: { name?, phone? }
  // tRPC:  trpc.profile.update.useMutation()
  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() => profileService.updateProfile(ctx.userId!, input));
    }),

  // ── GET /profile/addresses ────────────────────────────────
  // REST:  GET /profile/addresses
  // tRPC:  trpc.profile.getAddresses.useQuery()
  getAddresses: protectedProcedure.query(async ({ ctx }) => {
    return serviceCall(() => profileService.getAddress(ctx.userId!));
  }),

  // ── POST /profile/addresses ───────────────────────────────
  // REST:  POST /profile/addresses
  // tRPC:  trpc.profile.addAddress.useMutation()
  addAddress: protectedProcedure
    .input(addressSchema)
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() => profileService.addAddress(ctx.userId!, input));
    }),

  // ── PATCH /profile/addresses/:id ─────────────────────────
  // REST:  PATCH /profile/addresses/:id
  // tRPC:  trpc.profile.updateAddress.useMutation()
  updateAddress: protectedProcedure
    .input(
      z.object({
        addressId: z.string().uuid(),
        data:      addressSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() =>
        profileService.updateAddress(ctx.userId!, input.addressId, input.data)
      );
    }),

  // ── DELETE /profile/addresses/:id ────────────────────────
  // REST:  DELETE /profile/addresses/:id
  // tRPC:  trpc.profile.deleteAddress.useMutation()
  deleteAddress: protectedProcedure
    .input(z.object({ addressId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() =>
        profileService.deleteAddress(ctx.userId!, input.addressId)
      );
    }),

  // ── PATCH /profile/addresses/:id/default ─────────────────
  // REST:  PATCH /profile/addresses/:id/default
  // tRPC:  trpc.profile.setDefaultAddress.useMutation()
  setDefaultAddress: protectedProcedure
    .input(z.object({ addressId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await serviceCall(() =>
        profileService.setDefaultAddress(ctx.userId!, input.addressId)
      );
      return { success: true };
    }),
});
