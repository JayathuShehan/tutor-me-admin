import { GridIcon } from "@/icons";
import {
  BookOpen,
  HelpCircle,
  LibraryBig,
  MessageSquareHeart,
  NotebookText,
  UserCog,
  TextSearch,
  User,
  Gift,
  Coins,
} from "lucide-react";

const NavItems = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    name: "Academics",
    icon: <BookOpen />,
    subItems: [
      { name: "Grades", path: "/grades", pro: false },
      { name: "Subjects", path: "/subjects", pro: false },
      { name: "Papers", path: "/papers", pro: false },
    ],
  },
  {
    name: "Tuition",
    icon: <LibraryBig />,
    subItems: [
      { name: "Tuition Rates", path: "/tuition-rates", pro: false },
      { name: "Request for Tutors", path: "/request-tutor", pro: false },
    ],
  },
  // {
  //   icon: <GraduationCap />,
  //   name: "Levels and Exams",
  //   path: "/level-and-exams",
  // },
  {
    icon: <NotebookText />,
    name: "Blogs",
    path: "/blogs",
  },
  {
    icon: <MessageSquareHeart />,
    name: "Testimonials",
    path: "/testimonials",
  },
  {
    icon: <HelpCircle />,
    name: "FAQ",
    path: "/faqs",
  },
  {
    icon: <TextSearch />,
    name: "Inquiries",
    path: "/inquiries",
    subItems: [
      { name: "Contact Us", path: "/inquiries/contactus", pro: false },
    ],
  },
  {
    name: "Users",
    icon: <User />,
    path: "/users",
    subItems: [
      { name: "Tutors", path: "/tutors", pro: false },
      { name: "Users", path: "/users/all-users", pro: false },
      { name: "Referees", path: "/referees", pro: false },
    ],
  },
  {
    icon: <Gift />,
    name: "Referrals",
    path: "/referrals",
  },
  {
    icon: <Coins />,
    name: "Bonus Transactions",
    path: "/bonus-transactions",
  },
  {
    name: "Admin Management",
    icon: <UserCog />,
    path: "/admin-management",
  },
  // {
  //   icon: <MessageSquareMore />,
  //   name: "Contact Us",
  //   path: "/#keep-in-touch-section",
  // },
  // {
  //   icon: <CalenderIcon />,
  //   name: "Calendar",
  //   path: "/calendar",
  // },
  // {
  //   icon: <UserCircleIcon />,
  //   name: "User Profile",
  //   path: "/profile",
  // },
  // {
  //   name: "Forms",
  //   icon: <ListIcon />,
  //   subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  // },
  // {
  //   name: "Tables",
  //   icon: <TableIcon />,
  //   subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
  // },
  // {
  //   name: "Pages",
  //   icon: <PageIcon />,
  //   subItems: [
  //     { name: "Blank Page", path: "/blank", pro: false },
  //     { name: "404 Error", path: "/error-404", pro: false },
  //   ],
  // },
];

export default NavItems;
