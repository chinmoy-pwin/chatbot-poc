import Queue from 'bull';
import redisService from './redisService';

// Job types
export enum JobType {
  PROCESS_FILE = 'process_file',
  SCRAPE_URL = 'scrape_url',
  OPENAI_CHAT = 'openai_chat',
}

// Job data interfaces
export interface FileProcessJob {
  fileId: string;
  customerId: string;
  filePath: string;
  filename: string;
}

export interface ScrapeUrlJob {
  urlId: string;
  customerId: string;
  url: string;
}

export interface OpenAIChatJob {
  customerId: string;
  sessionId: string;
  message: string;
  context: string[];
}

class QueueService {
  private fileProcessQueue: Queue.Queue<FileProcessJob>;
  private scrapeQueue: Queue.Queue<ScrapeUrlJob>;
  private openaiQueue: Queue.Queue<OpenAIChatJob>;

  constructor() {
    const redisClient = redisService.getClient();
    
    // Create job queues
    this.fileProcessQueue = new Queue<FileProcessJob>('file-processing', {
      createClient: () => redisClient.duplicate(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      },
    });

    this.scrapeQueue = new Queue<ScrapeUrlJob>('web-scraping', {
      createClient: () => redisClient.duplicate(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    this.openaiQueue = new Queue<OpenAIChatJob>('openai-chat', {
      createClient: () => redisClient.duplicate(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
      limiter: {
        max: 50, // Max 50 jobs processed
        duration: 60000, // Per minute (rate limiting)
      },
    });

    console.log('✓ Job queues initialized');
  }

  // File processing queue
  async addFileProcessJob(data: FileProcessJob): Promise<Queue.Job<FileProcessJob>> {
    return await this.fileProcessQueue.add(data, {
      priority: 1,
    });
  }

  getFileProcessQueue(): Queue.Queue<FileProcessJob> {
    return this.fileProcessQueue;
  }

  // Web scraping queue
  async addScrapeJob(data: ScrapeUrlJob): Promise<Queue.Job<ScrapeUrlJob>> {
    return await this.scrapeQueue.add(data, {
      priority: 2,
    });
  }

  getScrapeQueue(): Queue.Queue<ScrapeUrlJob> {
    return this.scrapeQueue;
  }

  // OpenAI chat queue (with rate limiting)
  async addOpenAIChatJob(data: OpenAIChatJob, priority: number = 5): Promise<Queue.Job<OpenAIChatJob>> {
    return await this.openaiQueue.add(data, {
      priority,
      timeout: 30000, // 30 second timeout
    });
  }

  getOpenAIQueue(): Queue.Queue<OpenAIChatJob> {
    return this.openaiQueue;
  }

  // Get job status
  async getJobStatus(jobId: string, queueType: JobType): Promise<any> {
    let queue: Queue.Queue;
    
    switch (queueType) {
      case JobType.PROCESS_FILE:
        queue = this.fileProcessQueue;
        break;
      case JobType.SCRAPE_URL:
        queue = this.scrapeQueue;
        break;
      case JobType.OPENAI_CHAT:
        queue = this.openaiQueue;
        break;
      default:
        throw new Error('Invalid queue type');
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress(),
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    };
  }

  // Queue stats
  async getQueueStats(queueType: JobType): Promise<any> {
    let queue: Queue.Queue;
    
    switch (queueType) {
      case JobType.PROCESS_FILE:
        queue = this.fileProcessQueue;
        break;
      case JobType.SCRAPE_URL:
        queue = this.scrapeQueue;
        break;
      case JobType.OPENAI_CHAT:
        queue = this.openaiQueue;
        break;
      default:
        throw new Error('Invalid queue type');
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  // Cleanup
  async closeAll(): Promise<void> {
    await Promise.all([
      this.fileProcessQueue.close(),
      this.scrapeQueue.close(),
      this.openaiQueue.close(),
    ]);
  }
}

const queueService = new QueueService();

export default queueService;
