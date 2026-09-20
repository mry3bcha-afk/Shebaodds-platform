// ============================================
// SHEBAODDS - MATCHES ROUTES
// Complete Match Data, Live Scores, Odds
// Production-ready route ordering
// ============================================

import express, { Request, Response } from 'express';
import Match, { MATCH_STATUS } from './Match';
import { authenticate, isAdmin } from './authMiddleware';

const router = express.Router();

// ============================================
// MEMORY CACHE
// ============================================

class MemoryCache {
  private cache = new Map<
    string,
    {
      value: any;
      expiry: number;
    }
  >();

  get(key: string): any {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: string, value: any, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new MemoryCache();

// ============================================
// GET ALL MATCHES
// GET /api/v2/matches
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      league,
      status,
      featured,
      date,
      search,
      limit = '50',
      page = '1',
      sortBy = 'matchDate',
      sortOrder = 'asc'
    } = req.query;

    const query: any = {};

    // League filter
    if (league) {
      query.league = league;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Featured filter
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Date filter
    if (date) {
      const startDate = new Date(date as string);

      if (!Number.isNaN(startDate.getTime())) {
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(date as string);
        endDate.setHours(23, 59, 59, 999);

        query.matchDate = {
          $gte: startDate,
          $lte: endDate
        };
      }
    }

    // Search
    if (search) {
      const searchText = String(search).trim();

      if (searchText) {
        query.$or = [
          {
            homeTeam: {
              $regex: searchText,
              $options: 'i'
            }
          },
          {
            awayTeam: {
              $regex: searchText,
              $options: 'i'
            }
          },
          {
            league: {
              $regex: searchText,
              $options: 'i'
            }
          }
        ];
      }
    }

    // Pagination
    const parsedLimit = parseInt(String(limit), 10);
    const parsedPage = parseInt(String(page), 10);

    const limitNum =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 50;

    const pageNum =
      Number.isFinite(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const allowedSortFields = [
      'matchDate',
      'league',
      'homeTeam',
      'awayTeam',
      'status',
      'createdAt',
      'updatedAt'
    ];

    const requestedSortField = String(sortBy);

    const safeSortField = allowedSortFields.includes(
      requestedSortField
    )
      ? requestedSortField
      : 'matchDate';

    const safeSortOrder =
      String(sortOrder).toLowerCase() === 'desc'
        ? -1
        : 1;

    const sort = {
      [safeSortField]: safeSortOrder
    } as any;

    // Cache
    const cacheKey = `matches:${JSON.stringify(req.query)}`;

    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    // Database query
    const [matches, total] = await Promise.all([
      Match.find(query)
        .select('-oddsHistory -playerProps')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Match.countDocuments(query)
    ]);

    const response = {
      success: true,
      matches,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    };

    // Cache for 30 seconds
    cache.set(cacheKey, response, 30);

    return res.json(response);
  } catch (error: any) {
    console.error(
      '[MATCHES] GET ALL ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Failed to retrieve matches'
    });
  }
});

// ============================================
// GET LIVE MATCHES
// GET /api/v2/matches/live/all
// ============================================

router.get('/live/all', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'live_matches';

    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const matches = await Match.find({
      status: {
        $in: [
          MATCH_STATUS.LIVE,
          MATCH_STATUS.HALFTIME,
          MATCH_STATUS.SECOND_HALF,
          MATCH_STATUS.EXTRA_TIME
        ]
      }
    })
      .select(
        'matchId league homeTeam awayTeam homeScore awayScore scores minute status liveOdds statistics events'
      )
      .sort({ matchDate: 1 })
      .lean();

    const response = {
      success: true,
      matches
    };

    // Cache for 5 seconds
    cache.set(cacheKey, response, 5);

    return res.json(response);
  } catch (error: any) {
    console.error(
      '[MATCHES] GET LIVE ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Failed to retrieve live matches'
    });
  }
});

// ============================================
// GET UPCOMING MATCHES
// GET /api/v2/matches/upcoming/all
// ============================================

router.get('/upcoming/all', async (req: Request, res: Response) => {
  try {
    const parsedLimit = parseInt(
      String(req.query.limit || '50'),
      10
    );

    const limitNum =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 50;

    const matches = await Match.find({
      status: MATCH_STATUS.UPCOMING,
      matchDate: {
        $gt: new Date()
      }
    })
      .sort({ matchDate: 1 })
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      matches
    });
  } catch (error: any) {
    console.error(
      '[MATCHES] GET UPCOMING ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Failed to retrieve upcoming matches'
    });
  }
});

// ============================================
// GET FEATURED MATCHES
// GET /api/v2/matches/featured/all
// ============================================

router.get('/featured/all', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'featured_matches';

    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const matches = await Match.find({
      isFeatured: true,
      status: MATCH_STATUS.UPCOMING,
      matchDate: {
        $gt: new Date()
      }
    })
      .sort({ matchDate: 1 })
      .limit(10)
      .lean();

    const response = {
      success: true,
      matches
    };

    // Cache for 5 minutes
    cache.set(cacheKey, response, 300);

    return res.json(response);
  } catch (error: any) {
    console.error(
      '[MATCHES] GET FEATURED ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Failed to retrieve featured matches'
    });
  }
});

// ============================================
// GET LEAGUES
// GET /api/v2/matches/leagues/all
// ============================================

router.get('/leagues/all', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'leagues';

    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const leagues = await Match.distinct('league');

    const leaguesWithCount = await Promise.all(
      leagues.map(async (league: string) => {
        const [upcomingCount, liveCount] =
          await Promise.all([
            Match.countDocuments({
              league,
              status: MATCH_STATUS.UPCOMING,
              matchDate: {
                $gt: new Date()
              }
            }),

            Match.countDocuments({
              league,
              status: {
                $in: [
                  MATCH_STATUS.LIVE,
                  MATCH_STATUS.HALFTIME,
                  MATCH_STATUS.SECOND_HALF,
                  MATCH_STATUS.EXTRA_TIME
                ]
              }
            })
          ]);

        return {
          name: league,
          upcomingCount,
          liveCount
        };
      })
    );

    const response = {
      success: true,
      leagues: leaguesWithCount
    };

    // Cache for 1 hour
    cache.set(cacheKey, response, 3600);

    return res.json(response);
  } catch (error: any) {
    console.error(
      '[MATCHES] GET LEAGUES ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Failed to retrieve leagues'
    });
  }
});

// ============================================
// GET SINGLE MATCH
// GET /api/v2/matches/:matchId
//
// IMPORTANT:
// This route is intentionally AFTER all fixed
// routes such as /live/all and /leagues/all.
// ============================================

router.get('/:matchId', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'Match ID is required'
      });
    }

    const cacheKey = `match:${matchId}`;

    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const match = await Match.findOne({
      matchId
    }).lean();

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const response = {
      success: true,
      match
    };

    // Cache for 60 seconds
    cache.set(cacheKey, response, 60);

    return res.json(response);
  } catch (error: any) {
    console.error(
      '[MATCHES] GET SINGLE ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Failed to retrieve match'
    });
  }
});

// ============================================
// GET MATCH STATISTICS
// GET /api/v2/matches/:matchId/statistics
// ============================================

router.get(
  '/:matchId/statistics',
  async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;

      const match = await Match.findOne({
        matchId
      }).select(
        'statistics homeTeam awayTeam scores minute status'
      );

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      return res.json({
        success: true,
        statistics: match.statistics,
        scores: match.scores,
        minute: match.minute,
        status: match.status
      });
    } catch (error: any) {
      console.error(
        '[MATCHES] GET STATISTICS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Failed to retrieve match statistics'
      });
    }
  }
);

// ============================================
// GET MATCH EVENTS
// GET /api/v2/matches/:matchId/events
// ============================================

router.get(
  '/:matchId/events',
  async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;

      const match = await Match.findOne({
        matchId
      }).select(
        'events homeTeam awayTeam scores minute'
      );

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      return res.json({
        success: true,
        events: match.events,
        scores: match.scores,
        minute: match.minute
      });
    } catch (error: any) {
      console.error(
        '[MATCHES] GET EVENTS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Failed to retrieve match events'
      });
    }
  }
);

// ============================================
// GET LIVE ODDS
// GET /api/v2/matches/:matchId/odds/live
// ============================================

router.get(
  '/:matchId/odds/live',
  async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;

      const cacheKey = `live_odds:${matchId}`;

      const cached = cache.get(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const match = await Match.findOne({
        matchId
      }).select(
        'matchId liveOdds prematchOdds homeTeam awayTeam scores minute status'
      );

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      const odds = {
        matchId: match.matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.scores?.home ?? 0,
        awayScore: match.scores?.away ?? 0,
        minute: match.minute,
        status: match.status,
        liveOdds: match.liveOdds,
        prematchOdds: match.prematchOdds
      };

      const response = {
        success: true,
        odds
      };

      // Cache for 3 seconds
      cache.set(cacheKey, response, 3);

      return res.json(response);
    } catch (error: any) {
      console.error(
        '[MATCHES] GET LIVE ODDS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Failed to retrieve live odds'
      });
    }
  }
);

// ============================================
// GET ODDS HISTORY
// GET /api/v2/matches/:matchId/odds/history
// ============================================

router.get(
  '/:matchId/odds/history',
  async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;

      const parsedLimit = parseInt(
        String(req.query.limit || '50'),
        10
      );

      const limitNum =
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, 500)
          : 50;

      const match = await Match.findOne({
        matchId
      }).select('oddsHistory');

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      const history = match.oddsHistory
        ? match.oddsHistory.slice(-limitNum)
        : [];

      return res.json({
        success: true,
        history
      });
    } catch (error: any) {
      console.error(
        '[MATCHES] GET ODDS HISTORY ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Failed to retrieve odds history'
      });
    }
  }
);

// ============================================
// GET MATCH LINEUPS
// GET /api/v2/matches/:matchId/lineups
// ============================================

router.get(
  '/:matchId/lineups',
  async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;

      const match = await Match.findOne({
        matchId
      }).select(
        'lineups homeTeam awayTeam'
      );

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      return res.json({
        success: true,
        lineups: match.lineups
      });
    } catch (error: any) {
      console.error(
        '[MATCHES] GET LINEUPS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Failed to retrieve match lineups'
      });
    }
  }
);

// ============================================
// ADMIN: UPDATE LIVE ODDS
// POST /api/v2/matches/:matchId/odds/update
// ============================================

router.post(
  '/:matchId/odds/update',
  authenticate,
  isAdmin,
  async (req: any, res: Response) => {
    try {
      const { matchId } = req.params;
      const { odds } = req.body;

      if (!odds) {
        return res.status(400).json({
          success: false,
          message: 'Odds data is required'
        });
      }

      const match = await Match.findOne({
        matchId
      });

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      await match.updateLiveOdds(odds);

      // Broadcast to connected clients
      req.io?.to(`match_${matchId}`).emit(
        'odds_update',
        {
          matchId,
          odds: match.liveOdds,
          timestamp: new Date()
        }
      );

      // Clear cache
      cache.del(`live_odds:${matchId}`);
      cache.del(`match:${matchId}`);
      cache.clear();

      return res.json({
        success: true,
        liveOdds: match.liveOdds
      });
    } catch (error: any) {
      console.error(
        '[MATCHES] UPDATE LIVE ODDS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Failed to update live odds'
      });
    }
  }
);

// ============================================
// ADMIN: UPDATE LIVE SCORE
// POST /api/v2/matches/:matchId/score/update
// ============================================

router.post(
  '/:matchId/score/update',
  authenticate,
  isAdmin,
  async (req: any, res: Response) => {
    try {
      const { matchId } = req.params;

      const {
        homeScore,
        awayScore,
        minute
      } = req.body;

      if (
        homeScore === undefined ||
        awayScore === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            'homeScore and awayScore are required'
        });
      }

      const match = await Match.findOne({
        matchId
      });

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      await match.updateLiveScore(
        homeScore,
        awayScore,
        minute
      );

      // Broadcast to connected clients
      req.io?.to(`match_${matchId}`).emit(
        'score_update',
        {
          matchId,
          homeScore: match.scores.home,
          awayScore: match.scores.away,
          minute: match.minute,
          status: match.status
        }
      );

      // Clear cache
      cache.del(`match:${matchId}`);
      cache.del('live_matches');
      cache.clear();

      return res.json({
        success: true,
        scores: match.scores,
        minute: match.minute,
        status: match.status
      });
    } catch (error: any) {
      console.error(
        '[MATCHES] UPDATE LIVE SCORE ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Failed to update live score'
      });
    }
  }
);

// ============================================
// ADMIN: ADD MATCH EVENT
// POST /api/v2/matches/:matchId/events/add
// ============================================

router.post(
  '/:matchId/events/add',
  authenticate,
  isAdmin,
  async (req: any, res: Response) => {
    try {
      const { matchId } = req.params;
      const event = req.body;

      if (
        !event ||
        typeof event !== 'object' ||
        Array.isArray(event)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Valid event data is required'
        });
      }

      const match = await Match.findOne({
        matchId
      });

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      await match.addEvent(event);

      const addedEvent =
        match.events[
          match.events.length - 1
        ];

      // Broadcast to connected clients
      req.io?.to(`match_${matchId}`).emit(
        'event_update',
        {
          matchId,
          event: addedEvent,
          scores: match.scores,
          minute: match.minute
        }
      );

      // Clear cache
      cache.del(`match:${matchId}`);
      cache.del('live_matches');

      return res.json({
        success: true,
        event: addedEvent
      });
    } catch (error: any) {
      console.error(
        '[MATCHES] ADD EVENT ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Failed to add match event'
      });
    }
  }
);

// ============================================
// FINAL ROUTE SAFETY
// ============================================

// No generic routes should be added below this point
// unless they are intentionally intended to catch
// unmatched requests.

export default router;