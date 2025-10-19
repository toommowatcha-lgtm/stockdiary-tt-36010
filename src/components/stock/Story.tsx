import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stock, QuarterlyNote } from "@/types/stock";
import { useStocks } from "@/contexts/StockContext";
import { Button } from "@/components/ui/button";
import { Save, TrendingUp, Minus, TrendingDown, Bold, Italic, List, Plus } from "lucide-react";
import { sortPeriods } from "@/lib/periodSort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface StoryProps {
  stock: Stock;
}

export const Story: React.FC<StoryProps> = ({ stock }) => {
  const { updateStock } = useStocks();
  const [editing, setEditing] = useState(false);

  const defaultQuarters: QuarterlyNote[] = [
    { quarter: "Q1 2024", content: "" },
    { quarter: "Q2 2024", content: "" },
    { quarter: "Q3 2024", content: "" },
    { quarter: "Q4 2024", content: "" },
  ];

  const [story, setStory] = useState({
    quarters: stock.story?.quarters || defaultQuarters,
    guidanceTone: stock.story?.guidanceTone || "Neutral",
  });

  const addPeriod = () => {
    const quarters = story.quarters;
    const latestQuarter = quarters.length > 0 ? quarters[quarters.length - 1].quarter : "Q4 2023";
    const [q, year] = latestQuarter.split(" ");
    const quarterNum = parseInt(q.substring(1));
    
    let newQuarter: string;
    let newYear: string;
    
    if (quarterNum === 4) {
      newQuarter = "Q1";
      newYear = String(parseInt(year) + 1);
    } else {
      newQuarter = `Q${quarterNum + 1}`;
      newYear = year;
    }
    
    setStory({
      ...story,
      quarters: [...quarters, { quarter: `${newQuarter} ${newYear}`, content: "" }]
    });
  };

  const handleSave = () => {
    // Sort quarters chronologically before saving
    const sortedStory = {
      ...story,
      quarters: sortPeriods(story.quarters, 'quarter')
    };
    updateStock(stock.id, { story: sortedStory });
    setEditing(false);
  };

  // Sort quarters chronologically for display
  const sortedQuarters = useMemo(() => 
    sortPeriods(story.quarters, 'quarter'), 
    [story.quarters]
  );

  const updateQuarter = (index: number, content: string) => {
    const updatedQuarters = [...story.quarters];
    updatedQuarters[index] = { ...updatedQuarters[index], content };
    setStory({ ...story, quarters: updatedQuarters });
  };

  const formatText = (index: number, format: "bold" | "italic" | "bullet") => {
    const textarea = document.getElementById(`quarter-${index}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    let formattedText = "";
    if (format === "bold") {
      formattedText = `**${selectedText}**`;
    } else if (format === "italic") {
      formattedText = `*${selectedText}*`;
    } else if (format === "bullet") {
      formattedText = selectedText ? `• ${selectedText}` : "• ";
    }

    const newContent = beforeText + formattedText + afterText;
    updateQuarter(index, newContent);
  };

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case "Bullish":
        return <TrendingUp className="h-12 w-12 text-success" />;
      case "Bearish":
        return <TrendingDown className="h-12 w-12 text-destructive" />;
      default:
        return <Minus className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case "Bullish":
        return "text-success";
      case "Bearish":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {editing ? (
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        ) : (
          <Button onClick={() => setEditing(true)} variant="outline">
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 bg-card border-border">
          <Label className="text-lg font-semibold mb-3 block">CEO Guidance Tone</Label>
          <Select
            value={story.guidanceTone}
            onValueChange={(value) =>
              setStory({ ...story, guidanceTone: value as "Bullish" | "Neutral" | "Bearish" })
            }
            disabled={!editing}
          >
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="Bullish">Bullish</SelectItem>
              <SelectItem value="Neutral">Neutral</SelectItem>
              <SelectItem value="Bearish">Bearish</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-6 bg-card border-border flex flex-col items-center justify-center">
          <Label className="text-sm text-muted-foreground mb-4">Sentiment Visualization</Label>
          {getToneIcon(story.guidanceTone)}
          <p className={`mt-4 text-2xl font-bold ${getToneColor(story.guidanceTone)}`}>
            {story.guidanceTone}
          </p>
        </Card>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-lg font-semibold">Quarterly Earnings Notes</Label>
          {editing && (
            <Button onClick={addPeriod} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Period
            </Button>
          )}
        </div>
        <Accordion type="multiple" className="w-full">
          {sortedQuarters.map((quarter, index) => {
            const originalIndex = story.quarters.findIndex(q => q.quarter === quarter.quarter);
            return (
            <AccordionItem key={index} value={`item-${index}`} className="border-border">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{quarter.quarter}</span>
                  {quarter.content && (
                    <span className="text-xs text-muted-foreground">
                      ({quarter.content.length} characters)
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {editing && (
                    <div className="flex gap-2 mb-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => formatText(originalIndex, "bold")}
                        title="Bold (wrap selection in **)"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => formatText(originalIndex, "italic")}
                        title="Italic (wrap selection in *)"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => formatText(originalIndex, "bullet")}
                        title="Bullet point (add •)"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Textarea
                    id={`quarter-${originalIndex}`}
                    value={quarter.content}
                    onChange={(e) => updateQuarter(originalIndex, e.target.value)}
                    disabled={!editing}
                    className="min-h-[200px] bg-background font-mono text-sm"
                    placeholder={`Add notes from ${quarter.quarter} earnings call...\n\nTips:\n• Use **text** for bold\n• Use *text* for italic\n• Use • for bullet points`}
                  />
                  {!editing && quarter.content && (
                    <div className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-md">
                      {quarter.content.split("\n").map((line, i) => {
                        // Simple markdown-like rendering
                        let processedLine = line
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>");
                        
                        return (
                          <p
                            key={i}
                            dangerouslySetInnerHTML={{ __html: processedLine }}
                            className="mb-2 last:mb-0"
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            );
          })}
        </Accordion>
      </Card>
    </div>
  );
};
