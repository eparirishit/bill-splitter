import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Receipt, ThumbsDown, ThumbsUp, TrendingUp, Users } from 'lucide-react';

interface AnalyticsDashboardProps {
  userStats: {
    total_users: number;
    total_receipts_processed: number;
    total_corrections_made: number;
    average_accuracy_rating: number;
    active_users_last_30_days: number;
  };
  processingStats: {
    total_receipts: number;
    average_processing_time: number;
    total_feedback_received: number;
    accuracy_breakdown: {
      thumbs_up: number;
      thumbs_down: number;
    };
  };
  feedbackStats: {
    total_feedback: number;
    thumbs_up_count: number;
    thumbs_down_count: number;
    average_accuracy_ratings: {
      item_extraction: number;
      price_extraction: number;
      tax_extraction: number;
    };
  };
}

export function AnalyticsDashboard({
  userStats,
  processingStats,
  feedbackStats
}: AnalyticsDashboardProps) {
  const accuracyPercentage = feedbackStats.total_feedback > 0
    ? Math.round((feedbackStats.thumbs_up_count / feedbackStats.total_feedback) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Badge variant="secondary">Live Data</Badge>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total_users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.active_users_last_30_days} active in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts Processed</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingStats.total_receipts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.total_receipts_processed} by users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracyPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {feedbackStats.thumbs_up_count} thumbs up, {feedbackStats.thumbs_down_count} thumbs down
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingStats.average_processing_time}ms</div>
            <p className="text-xs text-muted-foreground">
              Average AI extraction time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Overview</CardTitle>
            <CardDescription>User satisfaction with AI extraction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span>Thumbs Up</span>
              </div>
              <Badge variant="outline">{feedbackStats.thumbs_up_count}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span>Thumbs Down</span>
              </div>
              <Badge variant="outline">{feedbackStats.thumbs_down_count}</Badge>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Total Feedback</span>
                <span>{feedbackStats.total_feedback}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>Accuracy Ratings</CardTitle>
            <CardDescription>Detailed accuracy breakdown (1-5 scale)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Item Extraction</span>
              <Badge variant="secondary">
                {feedbackStats.average_accuracy_ratings.item_extraction}/5
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Price Extraction</span>
              <Badge variant="secondary">
                {feedbackStats.average_accuracy_ratings.price_extraction}/5
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Tax Extraction</span>
              <Badge variant="secondary">
                {feedbackStats.average_accuracy_ratings.tax_extraction}/5
              </Badge>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Overall Rating</span>
                <span>{userStats.average_accuracy_rating}/5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Corrections Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Corrections Made</CardTitle>
          <CardDescription>User corrections to AI extraction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {userStats.total_corrections_made.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total Corrections</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {processingStats.total_receipts > 0 
                  ? Math.round((userStats.total_corrections_made / processingStats.total_receipts) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Correction Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {processingStats.total_feedback_received.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Feedback Received</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 