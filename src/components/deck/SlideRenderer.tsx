"use client";
import type { SlideSlot } from "@/lib/deck/types";
import {
  TitleSlide, AgendaSlide, SectionDividerSlide, BulletsSlide,
  StatsSlide, ComparisonSlide, ProcessSlide, QuoteSlide,
  ImageSplitSlide, ClosingSlide,
} from "./slides";

interface Props {
  slide: SlideSlot;
}

export function SlideRenderer({ slide }: Props) {
  switch (slide.component) {
    case "TitleSlide":
      return <TitleSlide {...slide.props} />;
    case "AgendaSlide":
      return <AgendaSlide {...slide.props} />;
    case "SectionDividerSlide":
      return <SectionDividerSlide {...slide.props} />;
    case "BulletsSlide":
      return <BulletsSlide {...slide.props} />;
    case "StatsSlide":
      return <StatsSlide {...slide.props} />;
    case "ComparisonSlide":
      return <ComparisonSlide {...slide.props} />;
    case "ProcessSlide":
      return <ProcessSlide {...slide.props} />;
    case "QuoteSlide":
      return <QuoteSlide {...slide.props} />;
    case "ImageSplitSlide":
      return <ImageSplitSlide {...slide.props} />;
    case "ClosingSlide":
      return <ClosingSlide {...slide.props} />;
    default:
      return null;
  }
}
