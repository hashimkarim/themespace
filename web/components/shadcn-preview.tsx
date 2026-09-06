"use client";

import {
  Fragment,
  useId,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  Code,
  Copy,
  Folder,
  Info,
  Italic,
  Mail,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  Underline,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { type Appearance, type Theme } from "@/lib/theme";
import { useSitePreferences } from "./site-preferences";
import { ShadcnThemeScope } from "./shadcn/preview-theme";
import { Button } from "./ui/button";
import { Input } from "./shadcn/input";
import { Textarea } from "./shadcn/textarea";
import { Label } from "./shadcn/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./shadcn/card";
import { Badge } from "./shadcn/badge";
import { Separator } from "./shadcn/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "./shadcn/avatar";
import { Checkbox } from "./shadcn/checkbox";
import { Switch } from "./shadcn/switch";
import { RadioGroup, RadioGroupItem } from "./shadcn/radio-group";
import { Slider } from "./shadcn/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./shadcn/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./shadcn/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./shadcn/accordion";
import { Progress } from "./shadcn/progress";
import { Alert, AlertTitle, AlertDescription } from "./shadcn/alert";
import { Skeleton } from "./shadcn/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./shadcn/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./shadcn/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./shadcn/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "./shadcn/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "./shadcn/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./shadcn/tooltip";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "./shadcn/sheet";
import { ScrollArea } from "./shadcn/scroll-area";
import { Toggle } from "./shadcn/toggle";
import { ToggleGroup, ToggleGroupItem } from "./shadcn/toggle-group";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "./shadcn/command";
import { Calendar } from "./shadcn/calendar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "./shadcn/chart";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./shadcn/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "./shadcn/pagination";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./shadcn/collapsible";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "./shadcn/hover-card";

type DemoProps = { theme: Theme; mode: Appearance };
function Feedback({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {children}
    </p>
  );
}

function ButtonsDemo() {
  const [status, setStatus] = useState(
    "Try a button to see its interaction state.",
  );
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            "default",
            "secondary",
            "outline",
            "ghost",
            "destructive",
            "link",
          ] as const
        ).map((variant) => (
          <Button
            key={variant}
            variant={variant}
            onClick={() =>
              setStatus(
                `${variant === "default" ? "Primary" : variant} button clicked.`,
              )
            }
          >
            {variant === "default"
              ? "Primary"
              : variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setStatus("A demo item was added.")}>
          <Plus /> Add item
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Copy example"
          onClick={() =>
            setStatus(
              "Copy button clicked. This example leaves your clipboard alone.",
            )
          }
        >
          <Copy />
        </Button>
        <Button disabled>Disabled</Button>
      </div>
      <Feedback>{status}</Feedback>
    </div>
  );
}

function FormDemo() {
  const id = useId();
  const [saved, setSaved] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setSaved(`Invitation preview ready for ${values.get("email")}.`);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-message`}>Message</Label>
        <Textarea
          id={`${id}-message`}
          name="message"
          placeholder="A little space to make together…"
          rows={3}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-disabled`}>Workspace URL</Label>
        <Input
          id={`${id}-disabled`}
          value="themespace.local/workspace"
          disabled
        />
      </div>
      <Button type="submit" className="w-fit">
        <Mail /> Preview invitation
      </Button>
      <Feedback>{saved || "A local form example. Nothing is sent."}</Feedback>
    </form>
  );
}

function SelectDemo() {
  const id = useId();
  const [value, setValue] = useState("personal");
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={id}>Workspace</Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Choose a workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Personal space</SelectItem>
            <SelectItem value="studio">Design studio</SelectItem>
            <SelectItem value="team">Team library</SelectItem>
            <SelectItem value="archived" disabled>
              Archived workspace
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Feedback>Selected: {value}.</Feedback>
    </div>
  );
}

function CheckboxDemo() {
  const id = useId();
  const [checked, setChecked] = useState(false);
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
        />
        <div className="grid gap-1">
          <Label htmlFor={id}>Include design tokens</Label>
          <p className="text-sm text-muted-foreground">
            Colors, typography, and shape.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id={`${id}-partial`} checked="indeterminate" disabled />
        <Label htmlFor={`${id}-partial`}>Partially selected (disabled)</Label>
      </div>
      <Feedback>
        {checked ? "Design tokens included." : "Design tokens excluded."}
      </Feedback>
    </div>
  );
}

function SwitchDemo() {
  const id = useId();
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id}>Activity notifications</Label>
        <Switch id={id} checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={`${id}-disabled`}>Managed by your team</Label>
        <Switch id={`${id}-disabled`} disabled />
      </div>
      <Feedback>
        Notifications {enabled ? "enabled" : "paused"} in this example.
      </Feedback>
    </div>
  );
}

function RadioDemo() {
  const id = useId();
  const [value, setValue] = useState("comfortable");
  return (
    <div className="grid gap-4">
      <RadioGroup
        aria-label="Example density"
        value={value}
        onValueChange={setValue}
      >
        {["comfortable", "compact", "spacious"].map((option) => (
          <div className="flex items-center gap-3" key={option}>
            <RadioGroupItem value={option} id={`${id}-${option}`} />
            <Label htmlFor={`${id}-${option}`}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <Feedback>Density: {value}.</Feedback>
    </div>
  );
}

function SliderDemo() {
  const [value, setValue] = useState([65]);
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between text-sm">
        <span>Preview volume</span>
        <output>{value[0]}%</output>
      </div>
      <Slider
        aria-label="Preview volume"
        value={value}
        onValueChange={setValue}
        max={100}
        step={1}
      />
      <Slider aria-label="Disabled slider" defaultValue={[30]} disabled />
      <Feedback>Drag the handle or use the arrow keys.</Feedback>
    </div>
  );
}

function ToggleDemo() {
  const [values, setValues] = useState<string[]>(["bold"]);
  const [code, setCode] = useState(false);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={values}
          onValueChange={setValues}
          aria-label="Text formatting"
        >
          <ToggleGroupItem value="bold" aria-label="Bold">
            <Bold />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <Italic />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <Underline />
          </ToggleGroupItem>
        </ToggleGroup>
        <Toggle
          pressed={code}
          onPressedChange={setCode}
          aria-label="Code style"
        >
          <Code />
        </Toggle>
      </div>
      <p
        style={{
          fontWeight: values.includes("bold") ? 700 : 400,
          fontStyle: values.includes("italic") ? "italic" : "normal",
          textDecoration: values.includes("underline") ? "underline" : "none",
          fontFamily: code ? "var(--ts-font-mono)" : "inherit",
        }}
      >
        Make yourself at home.
      </p>
    </div>
  );
}

function CardDemo({ theme }: DemoProps) {
  const [joined, setJoined] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your creative space</CardTitle>
        <CardDescription>A workspace dressed in {theme.name}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>TS</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">ThemeSpace studio</p>
            <p className="text-sm text-muted-foreground">
              A shared place for good ideas.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => setJoined(!joined)}>
          {joined ? <Check /> : <Plus />}
          {joined ? "Joined this demo" : "Join workspace"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function BadgeDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>
        <Check /> Published
      </Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">Personal</Badge>
      <Badge variant="destructive">Needs attention</Badge>
    </div>
  );
}

function AvatarDemo() {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar size="lg">
        <AvatarFallback>AL</AvatarFallback>
        <AvatarBadge>
          <Check />
        </AvatarBadge>
      </Avatar>
      <AvatarGroup>
        {["JA", "MK", "TS"].map((initials) => (
          <Avatar key={initials}>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        ))}
        <AvatarGroupCount>+4</AvatarGroupCount>
      </AvatarGroup>
      <Avatar size="sm">
        <AvatarFallback>you</AvatarFallback>
      </Avatar>
    </div>
  );
}

function AlertDemo() {
  return (
    <div className="grid gap-3">
      <Alert>
        <Info />
        <AlertTitle>A little heads-up</AlertTitle>
        <AlertDescription>
          Your palette is ready to try in a new workspace.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <Info />
        <AlertTitle>Example validation error</AlertTitle>
        <AlertDescription>
          Give your theme a name before publishing.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function ProgressDemo() {
  const [value, setValue] = useState(45);
  return (
    <div className="grid gap-4">
      <Progress value={value} aria-label="Example export progress" />
      <Feedback>{value}% complete</Feedback>
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setValue(value >= 100 ? 0 : Math.min(value + 25, 100))}
      >
        {value >= 100 ? "Start again" : "Advance progress"}
      </Button>
    </div>
  );
}

function SkeletonDemo() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-4" aria-busy={!loaded}>
        {loaded ? (
          <>
            <Avatar size="lg">
              <AvatarFallback>TS</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Your workspace is ready</p>
              <p className="text-sm text-muted-foreground">
                A calm place to create.
              </p>
            </div>
          </>
        ) : (
          <>
            <Skeleton className="size-12 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setLoaded(!loaded)}
      >
        {loaded ? "Show loading state" : "Show loaded content"}
      </Button>
    </div>
  );
}

const exampleRows = [
  { name: "Comfy", author: "Alex", status: "Published" },
  { name: "Paper", author: "Jamie", status: "Draft" },
  { name: "Moss", author: "Morgan", status: "Published" },
  { name: "Dusk", author: "Taylor", status: "Draft" },
  { name: "Tide", author: "Sam", status: "Published" },
  { name: "Sand", author: "Robin", status: "Draft" },
];
function TableDemo() {
  const [filter, setFilter] = useState("");
  const [ascending, setAscending] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const rows = exampleRows
    .filter((row) => row.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) =>
      ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );
  const pages = Math.max(1, Math.ceil(rows.length / 3));
  const visible = rows.slice(
    (Math.min(page, pages) - 1) * 3,
    Math.min(page, pages) * 3,
  );
  const allChecked =
    visible.length > 0 && visible.every((r) => selected.includes(r.name));
  return (
    <div className="grid gap-4">
      <Input
        placeholder="Filter themes…"
        aria-label="Filter example themes"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setPage(1);
        }}
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableCaption>
            Example themes · {selected.length} selected
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select visible themes"
                  checked={
                    allChecked
                      ? true
                      : visible.some((r) => selected.includes(r.name))
                        ? "indeterminate"
                        : false
                  }
                  disabled={!visible.length}
                  onCheckedChange={(v) =>
                    setSelected((previous) =>
                      v
                        ? [
                            ...new Set([
                              ...previous,
                              ...visible.map((r) => r.name),
                            ]),
                          ]
                        : previous.filter(
                            (name) => !visible.some((r) => r.name === name),
                          ),
                    )
                  }
                />
              </TableHead>
              <TableHead aria-sort={ascending ? "ascending" : "descending"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAscending(!ascending)}
                >
                  Theme <ArrowDownUp />
                </Button>
              </TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length ? (
              visible.map((row) => (
                <TableRow
                  key={row.name}
                  data-state={
                    selected.includes(row.name) ? "selected" : undefined
                  }
                >
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${row.name}`}
                      checked={selected.includes(row.name)}
                      onCheckedChange={(v) =>
                        setSelected((previous) =>
                          v
                            ? [...previous, row.name]
                            : previous.filter((n) => n !== row.name),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.author}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "Published" ? "default" : "secondary"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground"
                >
                  No themes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination aria-label="Example themes pages">
        <PaginationContent>
          {Array.from({ length: pages }, (_, index) => index + 1).map(
            (number) => (
              <PaginationItem key={number}>
                <PaginationLink
                  href={`#example-page-${number}`}
                  isActive={Math.min(page, pages) === number}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(number);
                  }}
                >
                  {number}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
        </PaginationContent>
      </Pagination>
    </div>
  );
}

const chartData = [
  { day: "Mon", themes: 18, remixes: 8 },
  { day: "Tue", themes: 25, remixes: 14 },
  { day: "Wed", themes: 21, remixes: 12 },
  { day: "Thu", themes: 34, remixes: 18 },
  { day: "Fri", themes: 29, remixes: 22 },
  { day: "Sat", themes: 42, remixes: 27 },
];
const chartConfig = {
  themes: { label: "Themes", color: "var(--chart-1)" },
  remixes: { label: "Remixes", color: "var(--chart-2)" },
} satisfies ChartConfig;
function ChartDemo() {
  const [showRemixes, setShowRemixes] = useState(true);
  return (
    <div className="grid gap-4">
      <ChartContainer
        config={chartConfig}
        className="h-56 w-full"
        role="img"
        aria-label="Example weekly activity: themes and remixes"
      >
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="themes"
            fill="var(--color-themes)"
            radius={4}
            isAnimationActive={false}
          />
          {showRemixes && (
            <Bar
              dataKey="remixes"
              fill="var(--color-remixes)"
              radius={4}
              isAnimationActive={false}
            />
          )}
        </BarChart>
      </ChartContainer>
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        aria-pressed={showRemixes}
        onClick={() => setShowRemixes(!showRemixes)}
      >
        {showRemixes ? "Hide" : "Show"} remixes
      </Button>
      <p className="text-sm text-muted-foreground">
        Sample data. Hover a bar or use the chart’s arrow-key navigation.
      </p>
    </div>
  );
}

// Fixed sample dates keep server and client output identical across time zones.
const exampleDate = new Date(2026, 8, 6, 12);
const dateLabel = (date: Date | undefined) =>
  date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date)
    : "Choose a date";
function CalendarDemo() {
  const [date, setDate] = useState<Date | undefined>(exampleDate);
  return (
    <div className="grid justify-items-center gap-3">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        defaultMonth={exampleDate}
        today={exampleDate}
        className="rounded-md border"
      />
      <Feedback>{dateLabel(date)}</Feedback>
    </div>
  );
}

function DatePickerDemo() {
  const [date, setDate] = useState<Date | undefined>();
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <CalendarDays />
            {dateLabel(date)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={exampleDate}
            today={exampleDate}
            onSelect={(next) => {
              setDate(next);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <Feedback>Pick a date from the calendar popover.</Feedback>
    </div>
  );
}

function TabsDemo() {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Example workspace tabs" className="w-full">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>A familiar workspace</CardTitle>
            <CardDescription>
              Everything you need, with room to breathe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">6 themes in your collection</Badge>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="activity">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Your Comfy palette was updated just now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">All changes are saved in this example.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Workspace preferences</CardTitle>
            <CardDescription>
              Try these example notification controls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SwitchDemo />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function AccordionDemo() {
  return (
    <Accordion type="single" collapsible defaultValue="tokens">
      <AccordionItem value="tokens">
        <AccordionTrigger>What makes a theme?</AccordionTrigger>
        <AccordionContent>
          A palette, a type system, and a few thoughtful decisions about shape
          and space.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="apps">
        <AccordionTrigger>Can I use it across apps?</AccordionTrigger>
        <AccordionContent>
          Choose the integrations you use and export their theme files from the
          same draft.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="local">
        <AccordionTrigger>Where do these demo changes go?</AccordionTrigger>
        <AccordionContent>
          These controls use temporary local React state. They reset when the
          example is unmounted.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function BreadcrumbDemo() {
  const [current, setCurrent] = useState("Comfy");
  return (
    <div className="grid gap-4">
      <Breadcrumb>
        <BreadcrumbList>
          {["Library", "Themes"].map((name) => (
            <Fragment key={name}>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`#${name.toLowerCase()}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrent(name);
                  }}
                >
                  {name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>Comfy</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Feedback>Current example location: {current}.</Feedback>
    </div>
  );
}

function CollapsibleDemo() {
  return (
    <Collapsible className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">3 files in your theme</p>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Toggle theme files">
            <ChevronDown />
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-3 py-2 font-mono text-sm">
        theme.css
      </div>
      <CollapsibleContent className="grid gap-2">
        {["tokens.json", "README.md"].map((file) => (
          <div
            key={file}
            className="rounded-md border px-3 py-2 font-mono text-sm"
          >
            {file}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ScrollAreaDemo() {
  return (
    <ScrollArea
      className="h-52 rounded-md border"
      tabIndex={0}
      aria-label="Scrollable example activity"
    >
      <div className="p-4">
        <p className="mb-3 text-sm font-medium">Recent activity</p>
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index}>
            <p className="py-3 text-sm">
              Palette {index + 1} added to your collection
            </p>
            {index < 11 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function DropdownDemo() {
  const [notifications, setNotifications] = useState(true);
  const [density, setDensity] = useState("comfortable");
  const [status, setStatus] = useState("Open the menu to explore its items.");
  return (
    <div className="grid gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-fit">
            Workspace menu <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>My workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setStatus("A demo workspace was created.")}
          >
            <Plus />
            New workspace
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setStatus("Example theme duplicated.")}
          >
            <Copy />
            Duplicate theme
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={notifications}
            onCheckedChange={setNotifications}
          >
            Notifications
          </DropdownMenuCheckboxItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Density</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={density}
                  onValueChange={setDensity}
                >
                  <DropdownMenuRadioItem value="comfortable">
                    Comfortable
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="compact">
                    Compact
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Team settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Feedback>
        {status} Notifications {notifications ? "on" : "off"}; {density}{" "}
        density.
      </Feedback>
    </div>
  );
}

function DialogDemo() {
  const id = useId();
  const [name, setName] = useState("Creative space");
  const [saved, setSaved] = useState("Creative space");
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-4">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setName(saved);
          setOpen(next);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" className="w-fit">
            Edit example workspace
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit workspace</DialogTitle>
            <DialogDescription>
              Try a dialog in your theme. This changes only the example below.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setSaved(name.trim());
              setOpen(false);
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor={id}>Workspace name</Label>
              <Input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Save example</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Feedback>Workspace: {saved}.</Feedback>
    </div>
  );
}

function AlertDialogDemo() {
  const [archived, setArchived] = useState(false);
  return (
    <div className="grid gap-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-fit">
            <Trash2 />
            Archive example
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this example?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a confirmation demo. Your actual themes and drafts are
              unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep example</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => setArchived(true)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Feedback>
        {archived ? "Example archived." : "The example is active."}
      </Feedback>
      {archived && (
        <Button
          variant="link"
          className="w-fit px-0"
          onClick={() => setArchived(false)}
        >
          Restore example
        </Button>
      )}
    </div>
  );
}

function PopoverDemo() {
  const id = useId();
  const [width, setWidth] = useState("320");
  return (
    <div className="grid gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-fit">
            <Settings />
            Dimensions
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="grid gap-4">
            <div>
              <h4 className="font-medium">Dimensions</h4>
              <p className="text-sm text-muted-foreground">
                Set the size of an example panel.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={id}>Width in pixels</Label>
              <Input
                type="number"
                id={id}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                min="200"
                max="800"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Feedback>Example panel width: {width || "0"} px.</Feedback>
    </div>
  );
}

function SheetDemo() {
  const [enabled, setEnabled] = useState(true);
  const id = useId();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Bell />
          Open activity panel
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Activity</SheetTitle>
          <SheetDescription>
            A side panel with your current theme.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 px-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={id}>Show notifications</Label>
            <Switch id={id} checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            {enabled
              ? "Your palette was updated. A new theme is ready to explore."
              : "Notifications are paused in this example."}
          </p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button>All caught up</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TooltipDemo() {
  const [status, setStatus] = useState(
    "Hover or focus the button for a tooltip.",
  );
  return (
    <div className="grid gap-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Add to example library"
            onClick={() => setStatus("Added to your example library.")}
          >
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add to your library</TooltipContent>
      </Tooltip>
      <Feedback>{status}</Feedback>
    </div>
  );
}

function HoverCardDemo() {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link" className="px-0">
          @themespace
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="flex gap-4">
          <Avatar>
            <AvatarFallback>TS</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <h4 className="text-sm font-semibold">ThemeSpace</h4>
            <p className="text-sm">
              A place for palettes, components, and the little details that make
              a workspace yours.
            </p>
            <p className="text-xs text-muted-foreground">Example profile</p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function CommandDemo() {
  const [value, setValue] = useState("No command selected.");
  return (
    <div className="grid gap-3">
      <Command className="rounded-lg border">
        <CommandInput
          placeholder="Type a command or search…"
          aria-label="Search example commands"
        />
        <CommandList className="max-h-52">
          <CommandEmpty>No commands found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => setValue("New theme selected.")}>
              <Plus />
              New theme<CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => setValue("Open library selected.")}>
              <Folder />
              Open library
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Workspace">
            <CommandItem onSelect={() => setValue("Preferences selected.")}>
              <Settings />
              Preferences
            </CommandItem>
            <CommandItem disabled>
              <Mail />
              Send invitation
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <Feedback>{value}</Feedback>
    </div>
  );
}

type Example = {
  id: string;
  name: string;
  category: string;
  description: string;
  Demo: ComponentType<DemoProps>;
  wide?: boolean;
  docs?: string;
};
export const shadcnExamples: Example[] = [
  {
    id: "button",
    name: "Button",
    category: "Controls",
    description: "Variants, sizes, icons, and disabled states.",
    Demo: ButtonsDemo,
  },
  {
    id: "input",
    name: "Form fields",
    category: "Forms",
    description: "Input, textarea, label, and native form validation.",
    Demo: FormDemo,
  },
  {
    id: "select",
    name: "Select",
    category: "Forms",
    description: "Keyboard navigation and a themed option menu.",
    Demo: SelectDemo,
  },
  {
    id: "checkbox",
    name: "Checkbox",
    category: "Forms",
    description: "Checked, unchecked, and indeterminate states.",
    Demo: CheckboxDemo,
  },
  {
    id: "switch",
    name: "Switch & separator",
    category: "Forms",
    description: "Independent on/off controls and dividers.",
    Demo: SwitchDemo,
  },
  {
    id: "radio-group",
    name: "Radio group",
    category: "Forms",
    description: "A single choice with roving keyboard focus.",
    Demo: RadioDemo,
  },
  {
    id: "slider",
    name: "Slider",
    category: "Forms",
    description: "Pointer and keyboard input with a live value.",
    Demo: SliderDemo,
  },
  {
    id: "toggle-group",
    name: "Toggle & toggle group",
    category: "Controls",
    description: "Try formatting a line of text.",
    Demo: ToggleDemo,
  },
  {
    id: "card",
    name: "Card",
    category: "Data display",
    description: "Header, content, footer, and a workspace action.",
    Demo: CardDemo,
  },
  {
    id: "badge",
    name: "Badge",
    category: "Data display",
    description: "Primary, secondary, outlined, and destructive.",
    Demo: BadgeDemo,
  },
  {
    id: "avatar",
    name: "Avatar",
    category: "Data display",
    description: "Fallbacks, sizes, status, and grouped avatars.",
    Demo: AvatarDemo,
  },
  {
    id: "alert",
    name: "Alert",
    category: "Data display",
    description: "Informational and destructive messages.",
    Demo: AlertDemo,
  },
  {
    id: "progress",
    name: "Progress",
    category: "Data display",
    description: "Advance an example export to completion.",
    Demo: ProgressDemo,
  },
  {
    id: "skeleton",
    name: "Skeleton",
    category: "Data display",
    description: "Switch between loading and loaded content.",
    Demo: SkeletonDemo,
  },
  {
    id: "table",
    name: "Table & pagination",
    category: "Data display",
    description: "Filter, sort, select rows, and change pages.",
    Demo: TableDemo,
    wide: true,
  },
  {
    id: "chart",
    name: "Chart",
    category: "Data display",
    description: "Recharts with shadcn tooltips and chart tokens.",
    Demo: ChartDemo,
    wide: true,
  },
  {
    id: "calendar",
    name: "Calendar",
    category: "Forms",
    description: "Day selection and month navigation.",
    Demo: CalendarDemo,
  },
  {
    id: "date-picker",
    name: "Date picker",
    category: "Forms",
    description: "Calendar and popover working together.",
    Demo: DatePickerDemo,
  },
  {
    id: "tabs",
    name: "Tabs",
    category: "Navigation",
    description: "Interactive panels with keyboard navigation.",
    Demo: TabsDemo,
  },
  {
    id: "accordion",
    name: "Accordion",
    category: "Navigation",
    description: "Expandable, keyboard-accessible content.",
    Demo: AccordionDemo,
  },
  {
    id: "breadcrumb",
    name: "Breadcrumb",
    category: "Navigation",
    description: "Links, separators, and the current location.",
    Demo: BreadcrumbDemo,
  },
  {
    id: "collapsible",
    name: "Collapsible",
    category: "Navigation",
    description: "Show and hide an example file list.",
    Demo: CollapsibleDemo,
  },
  {
    id: "scroll-area",
    name: "Scroll area",
    category: "Navigation",
    description: "A scrollable activity feed with custom scrollbars.",
    Demo: ScrollAreaDemo,
  },
  {
    id: "dropdown-menu",
    name: "Dropdown menu",
    category: "Overlays",
    description: "Actions, checkboxes, and a nested radio menu.",
    Demo: DropdownDemo,
  },
  {
    id: "dialog",
    name: "Dialog",
    category: "Overlays",
    description: "Edit a value, save, cancel, and return focus.",
    Demo: DialogDemo,
  },
  {
    id: "alert-dialog",
    name: "Alert dialog",
    category: "Overlays",
    description: "Confirm an action on a disposable example.",
    Demo: AlertDialogDemo,
  },
  {
    id: "popover",
    name: "Popover",
    category: "Overlays",
    description: "A compact panel anchored to its trigger.",
    Demo: PopoverDemo,
  },
  {
    id: "sheet",
    name: "Sheet",
    category: "Overlays",
    description: "A sliding panel with interactive settings.",
    Demo: SheetDemo,
  },
  {
    id: "tooltip",
    name: "Tooltip",
    category: "Overlays",
    description: "A small hint on hover or keyboard focus.",
    Demo: TooltipDemo,
  },
  {
    id: "hover-card",
    name: "Hover card",
    category: "Overlays",
    description: "A profile preview with richer content.",
    Demo: HoverCardDemo,
  },
  {
    id: "command",
    name: "Command",
    category: "Controls",
    description: "Search, filter, and select a command with cmdk.",
    Demo: CommandDemo,
  },
];

export function ShadcnPreview({
  theme,
  mode,
  compact = false,
}: DemoProps & { compact?: boolean }) {
  const { settings } = useSitePreferences();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [chosenMode, setChosenMode] = useState<Appearance>();
  const appearance = chosenMode && theme.modes[chosenMode] ? chosenMode : mode;
  const examples = shadcnExamples.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section
      className={`shadcn-gallery ${compact ? "compact" : ""}`}
      aria-label="shadcn/ui component previews"
      data-preview-renderer="shadcn-react"
    >
      <div className="library-toolbar">
        <label className="search-field">
          <Search size={15} />
          <input
            aria-label="Search shadcn components"
            placeholder="Find a shadcn component…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="appearance-toggle">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              disabled={!theme.modes[m]}
              aria-label={`${m} shadcn preview`}
              aria-pressed={appearance === m}
              onClick={() => setChosenMode(m)}
            >
              {m === "light" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          ))}
        </div>
      </div>
      <div
        className="library-categories"
        aria-label="shadcn component categories"
      >
        {[
          "All",
          "Controls",
          "Forms",
          "Data display",
          "Navigation",
          "Overlays",
        ].map((name) => (
          <button
            key={name}
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="shadcn-gallery-info">
        <span>{examples.length} examples · shadcn/ui React components</span>
        <a
          href="https://ui.shadcn.com/docs/components"
          target="_blank"
          rel="noreferrer"
        >
          Component docs <ArrowUpRight size={13} />
        </a>
      </div>
      <div
        className="shadcn-gallery-scroll"
        data-reduced-motion={settings.motion === "reduced" || undefined}
      >
        <ShadcnThemeScope theme={theme} mode={appearance}>
          <TooltipProvider delayDuration={200}>
            <div className="shadcn-example-grid">
              {examples.map(({ id, name, description, Demo, wide, docs }) => (
                <section
                  className={`shadcn-example ${wide ? "wide" : ""}`}
                  key={id}
                  data-preview-component={id}
                  aria-label={`${name} example`}
                >
                  <header className="shadcn-example-heading">
                    <div>
                      <h3>{name}</h3>
                      <p>{description}</p>
                    </div>
                    <a
                      href={`https://ui.shadcn.com/docs/components/${docs || id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${name} documentation`}
                    >
                      <ArrowUpRight size={14} />
                    </a>
                  </header>
                  <div className="shadcn-example-body">
                    <Demo theme={theme} mode={appearance} />
                  </div>
                </section>
              ))}
            </div>
            {examples.length === 0 && (
              <div className="shadcn-empty">
                <Search size={24} />
                <h3>No components found</h3>
                <p>Try a different name or category.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                >
                  Show all components
                </Button>
              </div>
            )}
          </TooltipProvider>
        </ShadcnThemeScope>
      </div>
      <p className="integration-preview-note">
        Real shadcn/ui components (Radix, New York style), using your exported
        CSS tokens. Demo data and actions stay in this preview.
      </p>
    </section>
  );
}
