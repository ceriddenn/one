import { TRPCError } from '@trpc/server';
import ytdl from 'ytdl-core';
import { GameplaySchema, GameplayTypes } from '@utils/zod/gameplay';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const userRouter = router({
  blackListUser: protectedProcedure
    .meta({ openapi: { method: 'PUT', path: '/user' } })
    .input(
      z.object({
        userId: z.string().cuid(),
        blacklisted: z.boolean(),
      }),
    )
    .output(z.object({ message: z.string(), blacklisted: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userDocument = await ctx.prisma.user.update({
          where: {
            id: input.userId,
          },
          data: {
            blacklisted: input.blacklisted,
          },
        });
        return {
          message: `blacklisted field on user: ${input.userId} changed to ${input.blacklisted}.`,
          blacklisted: input.blacklisted,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unknown error has occurred.',
          // not sure if its safe to give this to the user
          cause: error,
        });
      }
    }),
  deleteUser: protectedProcedure
    .meta({ openapi: { method: 'DELETE', path: '/user' } })
    .input(
      z.object({
        userId: z.string().cuid(),
      }),
    )
    .output(z.object({ message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      console.log(input.userId);
      try {
        const deletUser = await ctx.prisma.user.delete({
          where: {
            id: input.userId,
          },
        });
        return {
          message: `Successfully removed user ${input.userId}.`,
        };
      } catch (error) {
        console.log(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'An error occured while trying to delete user. Please contact support if this contiunes occuring.',
          // not sure if its safe to give this to the user
          cause: error,
        });
      }
    }),
  getLinkedAccounts: protectedProcedure
    .meta({ openapi: { method: 'GET', path: '/user/linkedaccounts' } })

    .output(
      z.array(
        z.object({
          userId: z.string().cuid(),
          provider: z.string(),
          id: z.string().cuid(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      try {
        const linkedAccounts = await ctx.prisma.account.findMany({
          where: {
            userId: ctx.session.user?.id,
          },
        });
        return linkedAccounts;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occured while trying to contact the database.',
          // not sure if its safe to give this to the user
          cause: error,
        });
      }
    }),
  unlinkAccount: protectedProcedure
    .meta({ openapi: { method: 'DELETE', path: '/user/linkedaccounts' } })
    .input(
      z.object({
        accountId: z.string().cuid(),
      }),
    )
    .output(
      z.object({
        message: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const deleteAccount = await ctx.prisma.account.delete({
          where: {
            id: input.accountId,
          },
        });
        return {
          message: `Successfully deleted the account with id: ${input.accountId}.`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `An error occured while attempting to delete the account with id: ${input.accountId}.`,
          // not sure if its safe to give this to the user
          cause: error,
        });
      }
    }),
  verifyUser: protectedProcedure
    .meta({ openapi: { method: 'PUT', path: '/user/verify' } })
    .input(
      z.object({
        tsToken: z.string(),
      }),
    )
    .output(
      z.object({
        message: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const endpoint =
        'https://challenges.cloudflare.com/turnstile/v0/siteverify';
      const secret = '0x4AAAAAAABo8KRLiXVr1Z4-RucWMfEmZls';
      const body = `secret=${encodeURIComponent(
        secret,
      )}&response=${encodeURIComponent(input.tsToken)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      });

      const data = await res.json();
      console.log(data);
      return {
        message: `Contacted the api.`,
      };
    }),
});
